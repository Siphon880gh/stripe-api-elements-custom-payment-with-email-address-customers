const express = require("express");
const app = express();
require("dotenv").config()

// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// If you choose to:
// const cors = require("cors");
// app.use(cors());

app.use(express.static("public"));
app.use(express.json());

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 140;
};

app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "usd",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // console.log("PaymentIntent created: ", paymentIntent) // Will return status of "requires_payment_method" which is normal because card etc not selected yet. This endpoint is hit with frontend's initialize()

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});


app.post("/confirmed-payment", async (req, res) => {
  // console.log(req.body)
  var { paymentIntentId, email } = req.body;

  upsertCustomerByEmail(paymentIntentId, email);

  res.json({});
});

// When hit /confirmed-payment, save new customer or update existing customer by email and attach payment by paymentIntentId
async function upsertCustomerByEmail(paymentIntentId, email) {
  try {
    // Retrieve the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('PaymentIntent not successful');
    }

    // Check if a customer already exists with the given email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      // Customer exists
      customer = existingCustomers.data[0];
    } else {
      // Create a new customer
      customer = await stripe.customers.create({
        email: email
      });
    }

    // Update the PaymentIntent to associate it with the customer
    const updatedPaymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      customer: customer.id
    });

    console.log('PaymentIntent successfully associated with customer:', updatedPaymentIntent);
  } catch (error) {
    console.error('Error handling PaymentIntent:', error);
  }
} // upsertCustomerByEmail

app.listen(4242, () => {
  console.log("Node server listening on port 4242!")
  console.log("Front page at: http://localhost:4242/checkout.html")
});