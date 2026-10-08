import { useState,useEffect } from "react";
import "./App.css"; 

function App() {
  const [selectedObject, setSelectedObject] = useState("Account");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false); 

  const [nextOffset, setNextOffset] = useState(20); 
const [loadingMore, setLoadingMore] = useState(false);

  const [showForm, setShowForm] = useState(false);
const [formData, setFormData] = useState({});
const [editingId, setEditingId] = useState(null);

  const objects = [
    "Account",
    "Opportunity",
    "Lead",
    "Contact",
    "Case"
  ];

  const fields = {
    Account: ["Name", "Phone", "Website", "Industry", "Type"],
    Opportunity: [
      "Name",
      "StageName",
      "Amount",
      "CloseDate",
      "Probability"
    ],
    Lead: [
      "FirstName",
      "LastName",
      "Company",
      "Email",
      "Phone",
      "Status"
    ],
    Contact: [
      "FirstName",
      "LastName",
      "Email",
      "Phone",
      "Title"
    ],
    Case: [
      "CaseNumber",
      "Subject",
      "Status",
      "Priority",
      "Origin"
    ]
  };
const checkLoginStatus = async () => {
  try {
    const response = await fetch(
      "https://salesforce-crud-app-oohj.onrender.com/auth/status",
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    setLoggedIn(data.loggedIn);
  } catch (error) {
    console.error("Login status error:", error);
  }
};

useEffect(() => {
  checkLoginStatus();
}, []);  

 const loadRecords = async (objectName) => {
  setLoading(true);

  try {
    const response = await fetch(
      `https://salesforce-crud-app-oohj.onrender.com/api/records/${objectName}?offset=0`,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to load records");
      return;
    }

    setRecords(data.records || []);
    setNextOffset(data.nextOffset);

  } catch (error) {
    console.error(error);
    alert("Could not connect to backend");
  } finally {
    setLoading(false);
  }
}; 

const loadMoreRecords = async () => {
  if (nextOffset === null || loadingMore) {
    return;
  }

  setLoadingMore(true);

  try {
    const response = await fetch(
      `https://salesforce-crud-app-oohj.onrender.com/api/records/${selectedObject}?offset=${nextOffset}`,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to load more records");
      return;
    }

    setRecords((prevRecords) => [
      ...prevRecords,
      ...(data.records || [])
    ]);

    setNextOffset(data.nextOffset);

  } catch (error) {
    console.error(error);
    alert("Could not load more records");
  } finally {
    setLoadingMore(false);
  }
}; 
  useEffect(() => {
  const handleScroll = () => {
    const scrollPosition =
      window.innerHeight + window.scrollY;

    const pageHeight =
      document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 200) {
      loadMoreRecords();
    }
  };

  window.addEventListener("scroll", handleScroll);

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [nextOffset, loadingMore]);


 const createRecord = async () => {
  try {
    const response = await fetch(
      `https://salesforce-crud-app-oohj.onrender.com/api/records/${selectedObject}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(formData)
      }
    );

  
    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to create record");
      return;
    }

    alert(`${selectedObject} created successfully!`);

    setShowForm(false);
    setFormData({});
    setEditingId(null);

    loadRecords(selectedObject);

  } catch (error) {
    console.error(error);
    alert("Could not connect to backend");
  }
};
  const updateRecord = async () => {
  try {
      const { Id, attributes, ...updateData } = formData;

    const response =    await   fetch(
      `https://salesforce-crud-app-oohj.onrender.com/api/records/${selectedObject}/${editingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(updateData)
      }
    );




    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to create record");
      return;
    }

    alert(`${selectedObject} updated successfully!`);

    setShowForm(false);
    setFormData({});
          setEditingId(null);
    loadRecords(selectedObject);

  } catch (error) {
    console.error(error);
    alert("Could not connect to backend");
  }
};

const deleteRecord = async (recordId) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this record?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(
      `https://salesforce-crud-app-oohj.onrender.com/api/records/${selectedObject}/${recordId}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to delete record");
      return;
    }

    alert(`${selectedObject} deleted successfully!`);

    loadRecords(selectedObject);

  } catch (error) {
    console.error(error);
    alert("Could not connect to backend");
  }
};

const logoutFromSalesforce = async () => {
  try {
    const response = await fetch(
      "https://salesforce-crud-app-oohj.onrender.com/auth/logout",
      {
        method: "GET",
        credentials: "include"
      }
    );

    console.log("Logout response status:", response.status);

    const data = await response.json();

    console.log("Logout response data:", data);

    if (!response.ok) {
      alert(data.message || "Logout failed");
      return;
    }

    setLoggedIn(false);
    setRecords([]);
setNextOffset(null);
    setShowForm(false);
    setFormData({});
    setEditingId(null);

    alert("Logged out successfully!");

  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not connect to backend");
  }
}; 

 const handleObjectChange = (event) => {
  const objectName = event.target.value;

  setSelectedObject(objectName);
  setRecords([]);
  setNextOffset(20);

  loadRecords(objectName);
};
  const loginToSalesforce = () => {
    window.location.href = "https://salesforce-crud-app-oohj.onrender.com/auth/login";
  };

  return (
    <div className="app-container" style={{ padding: "30px" }}>
      <div className="app-title">
  <h1>Salesforce CRUD App</h1>
  <p>Manage Salesforce Records</p>

  {loggedIn && (
    <div className="login-status">
      ● Salesforce Connected
    </div>
  )}
</div>

      {loggedIn ? (
  <button
    className="cancel-button"
    onClick={logoutFromSalesforce}
  >
    Logout
  </button>
) : (
  <button
    className="add-button"
    onClick={loginToSalesforce}
  >
    Login with Salesforce
  </button>
)} 

      <hr />
  <div className="controls">
      <label>
        <strong>Select Salesforce Object:</strong>
      </label>

      <br />
      <br />

      <select
        value={selectedObject}
        onChange={handleObjectChange}
      > 
        {objects.map((object) => (
          <option key={object} value={object}>
            {object}
          </option>
        ))}
      </select>
</div>
      {loading && <p>Loading records...</p>}

{!loading && (
  <button className="add-button"
    onClick={() => {
       setEditingId(null);
       setFormData({});
        setShowForm(true); 
    }}
  >
    Add {selectedObject}
  </button>
)}

 {showForm && (
  <div  className="form-container">
    <h2>{editingId ? `Edit ${selectedObject}` : `Add ${selectedObject}`}</h2>

    {fields[selectedObject]
      .filter((field) => !(selectedObject === "Case" && field === "CaseNumber"))
      .map((field) => (
        <div   key={field} className="form-group">
          <label>
            <strong>{field}</strong>
          </label>
          <br />
          <input
            type="text"
            value={formData[field] || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field]: e.target.value
              })
            }
          />
        </div>
      ))}

   <button className="save-button"
  onClick={editingId !==null ? updateRecord : createRecord}
>
  Save
</button>

    <button   className="cancel-button"
      onClick={() => setShowForm(false)}
      style={{ marginLeft: "10px" }}
    >
      Cancel
    </button>
  </div>
)}


      {!loading && records.length > 0 && (
         
        <table border="1" cellPadding="10">
          <thead>
  <tr>
    {fields[selectedObject].map((field) => (
      <th key={field}>{field}</th>
    ))}
    <th>Actions</th>
  </tr>
</thead>  

          <tbody>
           {records.map((record) => (
  <tr key={record.Id}>
    {fields[selectedObject].map((field) => (
      <td key={field}>
        {record[field] || "-"}
      </td>
    ))}

    <td>
   <button  className="edit-button"
  onClick={() => {
    console.log("EDIT RECORD:", record);
    console.log("RECORD ID:", record.Id);
  

    setEditingId(record.Id);
    setFormData({ ...record });
    setShowForm(true);
  }}
>
  Edit
</button>

  <button className="delete-button"
    onClick={() => deleteRecord(record.Id)}
    style={{ marginLeft: "10px" }}
  >
    Delete
  </button>




    </td>
  </tr>
))}
          </tbody>
        </table>
      )}

    

      {!loading && records.length === 0 && (
        <p>No records loaded.</p>
      )}

   {loadingMore && (
  <p className="loading">Loading more records...</p>
)}


    </div>
  ); 
}


 

export default App;


