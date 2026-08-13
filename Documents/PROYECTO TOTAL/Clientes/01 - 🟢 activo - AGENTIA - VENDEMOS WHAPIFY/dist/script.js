const whatsappButton = document.querySelector("#whatsappButton");

if (whatsappButton) {
  whatsappButton.addEventListener("click", () => {
    if (window.fbq) {
      window.fbq("trackCustom", "WhatsAppGroupClick");
    }
  });
}
