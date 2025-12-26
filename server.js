import express from "express";
import puppeteer from "puppeteer";
import proxies from "./proxies.js";

const app = express();
const port = 3000;

app.use(express.json());

const getRandomProxy = () => {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  const proxy = proxies[randomIndex];

  const [host, port, username, password] = proxy.split(":");
  return {
    server: `http://${host}:${port}`,
    username: username,
    password: password,
  };
};

const getFinalCookies = async (initialUrl) => {
  let browser;
  try {
    const proxyConfig = getRandomProxy();
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        `--proxy-server=${proxyConfig.server}`,
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9222",
      ],
    });
    const page = await browser.newPage();

    await page.goto(initialUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const continueLinkSelector = ".message.error a";

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.click(continueLinkSelector),
    ]);

    const cookies = await page.cookies();
    return cookies;
  } catch (error) {
    console.error("An error occurred during getFinalCookies:", error);

    throw new Error(
      "Failed to retrieve cookies. The link may have expired or the page structure changed."
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

async function checkLoginStatusWithPuppeteer(email, password) {
  let browser;
  try {
    const proxyConfig = getRandomProxy();
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        `--proxy-server=${proxyConfig.server}`,
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9222",
      ],
    });
    const page = await browser.newPage();

    await page.goto("https://login.followupboss.com/login", {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      page.click('input[type="submit"]'),
    ]);

    const finalHtml = await page.content();

    if (finalHtml.includes("Oops! Email address or password is not correct.")) {
      return {
        success: false,
        error: "Oops! Email address or password is not correct.",
      };
    }

    if (finalHtml.includes("You are logging in from a new location")) {
      const cookies = await page.cookies();
      return {
        success: false,
        error: "Verification Email Sent Successfully",
        newLocation: true,
        cookies: cookies,
      };
    }

    const cookies = await page.cookies();
    return { success: true, newLocation: false, cookies: cookies };
  } catch (error) {
    console.error(
      "An unexpected error occurred in checkLoginStatusWithPuppeteer:",
      error
    );
    throw new Error("An unexpected error occurred during the login process.");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.post("/check-login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await checkLoginStatusWithPuppeteer(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/get-cookies", async (req, res) => {
  const { initialUrl } = req.body;

  if (!initialUrl) {
    return res.status(400).json({ error: "initialUrl is required." });
  }

  try {
    const cookies = await getFinalCookies(initialUrl);
    res.status(200).json({ success: true, cookies: cookies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const testBrowser = async () => {
  let browser;
  try {
    const proxyConfig = getRandomProxy();
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        `--proxy-server=${proxyConfig.server}`,
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9222",
      ],
    });

    const page = await browser.newPage();
    await page.authenticate({
      username: proxyConfig.username,
      password: proxyConfig.password,
    });
    await page.goto("https://login.followupboss.com/login", {
      waitUntil: "networkidle2",
    });
    console.log("Browser launched and navigated to example.com");
  } catch (e) {
    console.error("Error launching browser:", e);
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }
  }
};

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  testBrowser();
});
