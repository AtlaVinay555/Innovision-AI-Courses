import { useEffect } from "react";

const GoogleTranslate = () => {
  useEffect(() => {
    let intervalId;
    intervalId = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        // Add English option if it doesn't exist
        const hasEnglish = Array.from(combo.options).some((opt) => opt.value === "en");
        if (!hasEnglish) {
          const opt = document.createElement("option");
          opt.value = "en";
          opt.textContent = "English";
          if (combo.options.length > 1) {
            combo.insertBefore(opt, combo.options[1]);
          } else {
            combo.appendChild(opt);
          }
        }

        // Keep selected option correct for English / default
        const googtrans = document.cookie.split("; ").find((row) => row.startsWith("googtrans="));
        if (!googtrans || googtrans.endsWith("/en")) {
          if (combo.value !== "") {
            combo.value = "";
          }
        }

        // Add change listener if not already added
        if (!combo.dataset.listenerAdded) {
          combo.dataset.listenerAdded = "true";
          combo.addEventListener("change", (e) => {
            if (e.target.value === "en") {
              // Clear googtrans cookie
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname.split('.').slice(-2).join('.');
              window.location.reload();
            }
          });
        }
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!document.querySelector("#google-translate-script")) {
      const addScript = document.createElement("script");
      addScript.id = "google-translate-script";
      addScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      addScript.async = true;
      document.body.appendChild(addScript);
    }

    window.googleTranslateElementInit = () => {
      if (!document.querySelector(".goog-te-combo")) {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en" },
          "google_translate_element"
        );
      }
    };
  }, []);

  return <div id="google_translate_element"></div>;
};

export default GoogleTranslate;