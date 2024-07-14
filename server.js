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


app.listen(4242, () => {
  console.log("Node server listening on port 4242!")
  console.log("Front page at: http://localhost:4242/checkout.html")
});