// This is your test publishable API key.
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY__PASTE_HERE);

// The items the customer wants to buy
const items = [{ id: "xl-tshirt" }];

let elements;

initialize();
checkStatus();

document
  .querySelector("#payment-form")
  .addEventListener("submit", handleSubmit);

// Fetches a payment intent and captures the client secret
async function initialize() {
  const response = await fetch("/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const { clientSecret } = await response.json();
  window.clientSecret = clientSecret;

  const appearance = {
    theme: 'stripe',
  };
  elements = stripe.elements({ appearance, clientSecret });

  const paymentElementOptions = {
    layout: "tabs",
  };

  const paymentElement = elements.create("payment", paymentElementOptions);
  paymentElement.mount("#payment-element");

  paymentElement.on("ready", handleReady);
  async function handleReady(e) {
    // alert("Ready")
    var paymentElementInner = document.querySelector("#payment-element .__PrivateStripeElement");
    var iframeElement = paymentElementInner.querySelector("iframe");
    var newElement = document.createElement("div");

    newElement.innerHTML = `
      <div class="p-GridCell p-GridCell--12 p-GridCell--sm6">
        <div data-field="email" class="p-Field">
          <label class="p-FieldLabel Label Label--empty" for="Field-email">Email</label>
          <div>
            <div class="p-Input">
              <input type="text" name="email" id="Field-email" placeholder="name@domain.com" aria-invalid="false" aria-required="true" class="p-Input-input Input Input--empty p-Input-input--textRight" value="demo_1@tests.videolistings.ai">
            </div>
          </div>
          <div class="AnimateSinglePresence"></div>
        </div>
      </div>
    `;

    // Insert the new element before the iframe
    paymentElementInner.insertBefore(newElement, iframeElement);
  }

}

async function handleSubmit(e) {
  e.preventDefault();

  if(document.getElementById("Field-email").value.length===0) {
    alert("Please enter email")
    return
  
  }

  setLoading(true);

  const rpromPaid = await stripe.confirmPayment({
    elements,
    redirect: 'if_required' // to disable strictness about redirecting with return_url
    // confirmParams: {
    //   // Make sure to change this to your payment completion page
    //   return_url: "http://localhost:4242/checkout.html",
    // },
  }).then(function(result) {
    if (result?.error) { alert("Error: ", result.error?.message); return; }

    console.log(result);


    /* Send to backend
     * result.paymentIntent.id
     * pi_XXX

     * result.paymentIntent.status
     * "succeeded"
     * 
     */ 

    fetch("/confirmed-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        paymentIntentId: result.paymentIntent.id, 
        email: document.getElementById("Field-email").value}),
    }).then(response => response.json())
    .then(data => {
        console.log(data);
    
        
        document.querySelector("#payment-element iframe").remove()
        document.querySelector("#submit").remove()
        document.querySelector("#Field-email").disabled = true
        // setTimeout(()=>{
        //   window.location.reload();
        // }, 5000)
    });

  }).catch(function(error) {
    console.log({error});
  })

  var error = {rpromPaid};

  // This point will only be reached if there is an immediate error when
  // confirming the payment. Otherwise, your customer will be redirected to
  // your `return_url`. For some payment methods like iDEAL, your customer will
  // be redirected to an intermediate site first to authorize the payment, then
  // redirected to the `return_url`.
  if (error?.type === "card_error" || error?.type === "validation_error") {
    showMessage(error.message);
  } else if(error?.code) {
    showMessage("An unexpected error occurred.");
  } else {
    checkStatus()
  }

  setLoading(false);
}

// Fetches the payment intent status after payment submission
async function checkStatus() {
  const clientSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret") || window.clientSecret;

  if (!clientSecret) {
    return;
  }

  const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

  switch (paymentIntent.status) {
    case "succeeded":
      showMessage("Payment succeeded! Thank you!");
      break;
    case "processing":
      showMessage("Your payment is processing.");
      break;
    case "requires_payment_method":
      showMessage("Your payment was not successful, please try again.");
      break;
    default:
      showMessage("Something went wrong.");
      break;
  }
}

// ------- UI helpers -------

function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");

  messageContainer.classList.remove("hidden");
  messageContainer.textContent = messageText;

  setTimeout(function () {
    if(messageContainer.textContent.includes("Payment succeeded"))
      return;
    messageContainer.classList.add("hidden");
    messageContainer.textContent = "";
  }, 4000);
}

// Show a spinner on payment submission
function setLoading(isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("#submit").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("#submit").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
}