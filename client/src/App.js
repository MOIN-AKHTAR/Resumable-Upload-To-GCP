import React, { useState, useEffect } from "react";
import axios from "axios";
import { Buffer } from "buffer";
import "./App.css";

const chunkSize = 32 * 256 * 1024; //8mb recomended.

//  First we upload file by clicking on choose file button.
// handleFileChange will be called on selecting file and file will be set in file state.
// On clicking upload file button i have called getSignedUrl function which will hit my backend and we will get signedUrl.
// This signedUrl will be set in url state.
// After getting signedUrl i have called getSessionUrl by passing signedUrl in getSessionUrl function as parameter
// In getSessionUrl i have make post request to get req.header.location as sessionUrl and set that sessionUrl in sessionUrl state.
// After getting sessionUrl i have called resumableUpload inwhich we will send chunk of files one by one by calling put request on sessionUrl.

function App() {
  const [file, setFile] = useState();
  const [url, setUrl] = useState(null);
  const [sessionUrl, setSessionUrl] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(null);
  const [from, setFrom] = useState(0);
  const [percent, setPercent] = useState(0);

  // 1
  const handleFileChange = (e) => {
    const comingFile = e.target.files[0];
    if (!comingFile) return;
    setFile(comingFile);
  };

  // 2
  const getSignedUrl = () => {
    const nameArr = file.name.replace(/\s/g, "").split(".");
    const newName = `${Date.now()}.${nameArr[nameArr.length - 1]}`;
    axios
      .get(`http://localhost:8080/getSignedUrl?fileName=${newName}`, {})
      .then((res) => {
        const signedUrl = res.data.url;
        setUrl(signedUrl);
        getSessionUrl(signedUrl);
      })
      .catch((err) => console.log(err.message));
  };
  // 3
  const getSessionUrl = (signedUrl) => {
    axios({
      method: "POST",
      url: signedUrl,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Content-Type": "application/octet-stream",
        "X-Goog-Resumable": "start",
      },
      data: {},
    })
      .then((res) => {
        setSessionUrl(res.headers.location);
      })
      .catch((err) => {});
  };

  // 4
  const resumableUpload = (url, tempFrom) => {
    if (file) {
      const reader = new FileReader();
      const to = (tempFrom || from) + chunkSize;
      const blob = file.slice(tempFrom || from, to);
      reader.onload = (e) => {
        const chunk = new Buffer(e.target.result.split(",")[1], "base64");
        setCurrentChunk(chunk);
        axios({
          url: url || sessionUrl,
          method: "PUT",
          headers: {
            "X-Upload-Content-Length": chunk.length,
            "Content-Range": `bytes ${tempFrom || from}-${Math.min(
              to - 1,
              file.size - 1
            )}/${file.size}`,
            "Content-Type": "application/octet-stream",
            "Access-Control-Allow-Origin": "http://localhost:3000", //Access-Control-Allow-Origin must be same as given in server config.js storage.bucket(process.env.BUCKET_NAME)setCorsConfiguration([{origin:process.env.ORIGIN}])
          },
          data: chunk,
        })
          .then((data) => {
            setPercent(100);
            // Uploaded Stuff Url...
            console.log(data.request.responseURL.split("?")[0]);
          })
          .catch((err) => {
            if (err.response.status === 308) {
              if (err.response.headers.range) {
                const upperBound = +err.response.headers.range
                  .split("=")[1]
                  .split("-")[1];
                setFrom(upperBound);
                setPercent(Math.floor((upperBound / file.size) * 100));
                return resumableUpload(null, upperBound);
              } else {
                return resumableUpload(null, from);
              }
            } else {
              console.log(
                "Network Error Or Other Scnerios Please Check in docs for other statuses...."
              );
              console.log(err);
            }
          });
      };
      reader.readAsDataURL(blob);
    }
  };

  useEffect(() => {
    if (sessionUrl) {
      resumableUpload(sessionUrl);
    }
  }, [sessionUrl]);

  return (
    <div className="App">
      <header className="App-header">
        {percent >= 100 && <h1>Uploaded Successfully!!!</h1>}
        <p>{percent}% uploaded</p>
        <input type={"file"} onChange={handleFileChange} />
        <button onClick={getSignedUrl}>Upload File</button>
      </header>
    </div>
  );
}

export default App;
