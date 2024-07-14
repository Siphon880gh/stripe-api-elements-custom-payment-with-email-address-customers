# Stripe API + Stripe Element + Custom Payment Flow with Email

By Weng Fei Fung.

Build a simple checkout form to collect payment details. This application uses NodeJS with vanilla JS and the Stripe API. For rendering, we use Stripe Elements with vanilla JS, which provides basic webpage UI. While you can convert this to React, it is recommended to first experiment with vanilla JS as it gives you more control to explore the Stripe API. Included are some basic build and run scripts you can use to start up the application. This application can incorporate email, create customers, associate customers with payments, and provides an API endpoint to show all payments associated with a customer.

Stripe Elements does not officially support email and do not have email fields as of July 2024. My boilerplate works around this by inserting an input field with similar style to the Stripe Elements and hooking into the Pay Now button to send the input field value to Stripe API which does support email.

This boiletplate does not save the customer's name to Stripe API because my use case while developing this boilerplate didn't need to, however I've commented out the name in the API endpoint /confirmed-payment so you can uncomment it if your app saves the customer's name.

For other attributes besides email, name, and the standard fields that Stripe API offers, you can add custom fields by sending "metadata" to Stripe API.

## Requirements

- A Stripe account.

## Setup

1. Create an `.env` file to store your Stripe secret key, and as for your Stripe publishable key:
    - `STRIPE_SECRET_KEY`: Your secret key for `server.js`, which has the ultimate authority on the final price and more access to Stripe.
    - Your publishable key can be pasted over at frontend `checkout.js` at `const stripe = Stripe(STRIPE_PUBLISHABLE_KEY__PASTE_HERE);`
    Note: I decided not to load in modules to make this more accessible to total beginners, so it's a straight copy and paste of your key into the source code.

    It doesn't matter if they're test or live keys. Just make sure it's consistent (publishable key and secret keys are both live or both test). Remember at Stripe Dashboard you can be in Test Mode (where API calls do not affect your bank) or Live Mode.

## Running the sample

1. Build the server:

    ```sh
    npm install
    ```

2. Run the server:

    ```sh
    npm start
    ```

3. Go to [http://localhost:4242/checkout.html](http://localhost:4242/checkout.html)

## Routes

### POST /create-payment-intent

- This route is triggered when initializing the checkout page.
- It sets up a payment intent that Stripe expects to be closed with a payment.
- Initially, the payment intent will have a status indicating that an automatic payment method isn't chosen yet. This is expected if you console log the payment intent object.
- The secret key will be returned to `checkout.html`, which Stripe Elements will use to render the pay form.
- The secret key proves the payment intent succeeded on the backend and authenticates the session adequately, even though it's exposed to the public for Stripe Elements to render the iframe form.

### POST /confirmed-payment

- When a user successfully pays, the frontend will hit this internal API endpoint to send over the email and payment intent ID.
- The endpoint will look for any existing Stripe customers by the email and:
  - If the customer doesn't exist, it creates the customer and attaches the payment to it.
  - If the customer exists, it appends the payment to the existing customer.

### GET /payments/:customerId

- This endpoint retrieves all payments associated with a given customer ID. Eg. `{successfulPayments:[..], failedPayments:[..]}`
- This functionality is beyond the scope of the basic boilerplate but assumes you are tracking `customerId` associated with the user login via a database, local storage, IndexedDB, or other means.
