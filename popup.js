const cookieNameMap = {
  "x.com": "auth_token",
  "twitter.com": "auth_token",
};

const cookieResult = document.getElementById("cookie-result");
const copyButton = document.getElementById("copy-button");
const allowButton = document.getElementById("allow-button");
let currentValue = "";

function displayValue(name, value) {
  currentValue = value;
  cookieResult.innerHTML = `<strong>[${name}]</strong> ${value}`;
}

allowButton.addEventListener("click", async () => {
  try {
    await navigator.permissions.query({ name: "clipboard-write" });
    await navigator.clipboard.writeText(currentValue);
    allowButton.textContent = "COPIED TO CLIPBOARD";
    setTimeout(() => {
      allowButton.style.display = "none";
      copyButton.style.display = "inline";

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(currentValue).then(() => {
          copyButton.textContent = "COPIED TO CLIPBOARD!";
        });
      });
    }, 1000);
  } catch (err) {
    cookieResult.textContent = "FAILED TO GET PERMISSION";
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  try {
    const split = new URL(tab.url).hostname.replace("www.", "").split(".");

    // excudes subdomains
    const domain = split[split.length - 2] + "." + split[split.length - 1];
    console.log(`Current domain: ${domain}`);

    switch (domain) {
      case "discord.com":
        try {
          const [token] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              // have to reload so the token is put into local storage
              window.location.reload();
              return window.localStorage?.token;
            },
          });

          if (!token.result) {
            throw new Error("No token found");
          }

          displayValue("token", token.result.replaceAll('"', ""));
        } catch (e) {
          console.error(e);
          cookieResult.textContent =
            "An error occurred while fetching the token.";
        }
        break;
      default:
        try {
          const cookieName = cookieNameMap[domain];

          if (cookieName) {
            const cookie = await getCookie(tab.url, cookieName);
            console.log(cookie);
            if (cookie) {
              displayValue(cookieName, cookie.value);
            } else {
              cookieResult.textContent = "No cookie found.";
            }
          } else {
            cookieResult.textContent =
              "Invalid domain. Please open a supported website.";
          }
        } catch (e) {
          console.error(e);
          cookieResult.textContent =
            "An error occurred while fetching the cookie for this domain.";
        }
        break;
    }
  } catch (e) {
    cookieResult.textContent =
      "An error occurred while fetching the cookie. Most likely an invalid domain.";
  }
});

function getCookie(url, name) {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(cookie);
      }
    });
  });
}
