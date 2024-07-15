const express = require("express");
const app = express();
require("dotenv").config()

// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// If you choose to make this a public API rather than an internal API:
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

// Sets up a payment intent that Stripe expects to be closed with a payment.
// Called by initialize at the frontend checkout.js
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

// When a user successfully pays, the frontend will hit this internal API endpoint to send over the email and payment intent ID.
// This is to associate the payment with the customer.
// Upserts customer by email address and attaches payment by payment intent id"
app.post("/confirmed-payment", async (req, res) => {
  // console.log(req.body)
  // var { paymentIntentId, email, name } = req.body;  // If your use case requires a name to save to Stripe
  var { paymentIntentId, email } = req.body;

  //upsertCustomerByEmail(paymentIntentId, email, name); // If your use case requires a name to save to Stripe
  upsertCustomerByEmail(paymentIntentId, email);

  res.json({});
});

// When hit /confirmed-payment, save new customer or update existing customer by email and attach payment by paymentIntentId
async function upsertCustomerByEmail(paymentIntentId, email, name="") {
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
        email: email,
        //name: name
      });
    }

    // Update the PaymentIntent to associate it with the customer
    const updatedPaymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      customer: customer.id
    });

    console.log('PaymentIntent successfully associated with customer. Customer ID:', customer.id);
    // console.log('PaymentIntent successfully associated with customer:', updatedPaymentIntent);
  } catch (error) {
    console.error('Error handling PaymentIntent:', error);
  }
} // upsertCustomerByEmail


// This endpoint retrieves all payments associated with a given customer ID.
// Eg. {successfulPayments:[..], failedPayments:[..]}
app.get('/payments/:customerId', async (req, res) => {
  const customerId = req.params.customerId;

  try {
    // Retrieve all PaymentIntents for the customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    // Filter for successful and failed payments
    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded');
    const failedPayments = paymentIntents.data
      .filter(pi => pi.status === 'requires_payment_method')
      .map(pi => ({
        paymentIntent: pi,
        failureReason: pi.last_payment_error ? pi.last_payment_error.message : 'Unknown reason',
      }));

    const filteredPayments = {
      successfulPayments,
      failedPayments,
    };

    res.status(200).json(filteredPayments);
  } catch (error) {
    console.error('Error retrieving payments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => {
  console.log("Node server listening for API internal calls on port 4242!")
  console.log("Front page at: http://localhost:4242/checkout.html")
});