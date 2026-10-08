const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const session = require("express-session");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "https://salesforce-crud-app-rho.vercel.app",
    credentials: true
  })
);

app.use(express.json());

app.use(
  session({
    secret: "salesforce-crud-secret",
    resave: false,
    saveUninitialized: true
  })
);


app.get('/', (req, res) => {
  console.log("This is Default Route");
  res.send("Salesforce CRUD Backend is running...");
})


// Salesforce Login
app.get("/auth/login", (req, res) => {
  console.log("AUTH LOGIN ROUTE WAS CALLED");

  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  req.session.codeVerifier = codeVerifier;

  const authUrl =
    "https://login.salesforce.com/services/oauth2/authorize" +
    "?response_type=code" +
    "&client_id=" + encodeURIComponent(process.env.SALESFORCE_CLIENT_ID) +
    "&redirect_uri=" + encodeURIComponent(process.env.SALESFORCE_CALLBACK_URL) +
    "&code_challenge=" + encodeURIComponent(codeChallenge) +
    "&code_challenge_method=S256";

  console.log("CODE CHALLENGE CREATED:", codeChallenge);
  console.log("AUTH URL:", authUrl);

  res.redirect(authUrl);
});





app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  const codeVerifier = req.session.codeVerifier;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  if (!codeVerifier) {
    return res.status(400).send("PKCE code verifier is missing");
  }

  try {
    const response = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        redirect_uri: process.env.SALESFORCE_CALLBACK_URL,
        code_verifier: codeVerifier
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    req.session.salesforce = response.data;
    res.redirect("http://localhost:5176");

  } catch (error) {
    console.log(
      "Salesforce OAuth error:",
      error.response?.data || error.message
    );

    res.status(500).send("Salesforce login failed");
  }
});


app.get("/api/accounts", async (req, res) => {
  try {
    const salesforce = req.session.salesforce;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    const response = await axios.get(
      salesforce.instance_url + "/services/data/v65.0/query",
      {
        params: {
          q: "SELECT Id, Name FROM Account LIMIT 20"
        },
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.log(
      "Salesforce API error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to fetch Accounts",
      error: error.response?.data || error.message
    });
  }
});

app.get("/api/records/:objectName", async (req, res) => {
  try {
    const salesforce = req.session.salesforce;
    const objectName = req.params.objectName;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    const allowedObjects = [
      "Account",
      "Opportunity",
      "Lead",
      "Contact",
      "Case"
    ];

    if (!allowedObjects.includes(objectName)) {
      return res.status(400).json({
        message: "Invalid Salesforce object"
      });
    }

    const fields = {
      Account: "Id,Name,Phone,Website,Industry,Type",
      Opportunity: "Id,Name,StageName,Amount,CloseDate,Probability",
      Lead: "Id,FirstName,LastName,Company,Email,Phone,Status",
      Contact: "Id,FirstName,LastName,Email,Phone,Title",
      Case: "Id,CaseNumber,Subject,Status,Priority,Origin"
    };

    const offset = parseInt(req.query.offset) || 0;

    const query = `SELECT ${fields[objectName]} FROM ${objectName} LIMIT 20 OFFSET ${offset}`;

    const response = await axios.get(
      salesforce.instance_url + "/services/data/v65.0/query",
      {
        params: {
          q: query
        },
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`
        }
      }
    );

    res.json({
      records: response.data.records,
      nextOffset:
        response.data.records.length === 20
          ? offset + 20
          : null
    });

  } catch (error) {
    console.log(
      "Salesforce API error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to fetch Salesforce records",
      error: error.response?.data || error.message
    });
  }
});

app.get("/api/records/next", async (req, res) => {
  try {
    const salesforce = req.session.salesforce;
    const nextUrl = req.query.url;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    if (!nextUrl) {
      return res.status(400).json({
        message: "Next records URL is missing"
      });
    }

    const response = await axios.get(
      salesforce.instance_url + nextUrl,
      {
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`
        }
      }
    );

    res.json({
      records: response.data.records,
      nextRecordsUrl: response.data.nextRecordsUrl || null
    });

  } catch (error) {
    console.log(
      "Salesforce Next Records Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to fetch more Salesforce records",
      error: error.response?.data || error.message
    });
  }
});

app.post("/api/records/:objectName", async (req, res) => {
  try {
    const salesforce = req.session.salesforce;
    const objectName = req.params.objectName;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    const allowedObjects = [
      "Account",
      "Opportunity",
      "Lead",
      "Contact",
      "Case"
    ];

    if (!allowedObjects.includes(objectName)) {
      return res.status(400).json({
        message: "Invalid Salesforce object"
      });
    }

    const response = await axios.post(
      salesforce.instance_url +
      `/services/data/v65.0/sobjects/${objectName}`,
      req.body,
      {
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(201).json(response.data);

  } catch (error) {
    console.log(
      "Salesforce Create Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to create Salesforce record",
      error: error.response?.data || error.message
    });
  }
});


app.put("/api/records/:objectName/:id", async (req, res) => {
  try {
    const salesforce = req.session.salesforce;
    const objectName = req.params.objectName;
    const recordId = req.params.id;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    const allowedObjects = [
      "Account",
      "Opportunity",
      "Lead",
      "Contact",
      "Case"
    ];

    if (!allowedObjects.includes(objectName)) {
      return res.status(400).json({
        message: "Invalid Salesforce object"
      });
    }

    await axios.patch(
      salesforce.instance_url +
      `/services/data/v65.0/sobjects/${objectName}/${recordId}`,
      req.body,
      {
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      message: "Record updated successfully"
    });

  } catch (error) {
    console.log(
      "Salesforce Update Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Failed to update Salesforce record",
      error: error.response?.data || error.message
    });
  }
});


app.delete("/api/records/:objectName/:id", async (req, res) => {
  console.log("DELETE ROUTE CALLED:", req.params);
  try {
    const salesforce = req.session.salesforce;
    const objectName = req.params.objectName;
    const recordId = req.params.id;

    if (!salesforce) {
      return res.status(401).json({
        message: "Please login to Salesforce first"
      });
    }

    const allowedObjects = [
      "Account",
      "Opportunity",
      "Lead",
      "Contact",
      "Case"
    ];

    if (!allowedObjects.includes(objectName)) {
      return res.status(400).json({
        message: "Invalid Salesforce object"
      });
    }

    await axios.delete(
      salesforce.instance_url +
      `/services/data/v65.0/sobjects/${objectName}/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${salesforce.access_token}`
        }
      }
    );

    res.json({
      success: true,
      message: "Record deleted successfully"
    });

  } catch (error) {
    console.log("========== DELETE ERROR ==========");
    console.log(error.response?.data);
    console.log(error.message);
    console.log("=================================");

    res.status(500).json({
      message: "Failed to delete Salesforce record",
      error: error.response?.data || error.message
    });
  }
});

app.get("/auth/status", (req, res) => {
  if (req.session.salesforce) {
    return res.json({
      loggedIn: true
    });
  }

  res.json({
    loggedIn: false
  });
});

app.get("/auth/logout", (req, res) => {
  console.log("LOGOUT ROUTE CALLED");

  req.session.destroy((error) => {
    if (error) {
      console.log("LOGOUT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message
      });
    }

    console.log("SESSION DESTROYED SUCCESSFULLY");

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started running on port no ${PORT}...`);
})
