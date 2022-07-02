import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Buffer } from "buffer";
import "./App.css";

const chunkSize = 1024 * 1024 * 1; //8mb recomended.
// file size given in number of bytes...

function App() {
  const [file, setFile] = useState();
  const [url, setUrl] = useState(null);
  const [sessionUrl, setSessionUrl] = useState(null);
  const [firstChunk, setFirstChunk] = useState(null);
  const [lastChunk, setLastChunk] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(null);
  const [from, setFrom] = useState(0);

  const uploadForInitialSignedUrlChunk = useCallback(
    (readerEvent) => {
      // const data = new Buffer(readerEvent.split(",")[1], "base64");
      axios({
        method: "POST",
        url,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Content-Type": "application/octet-stream",
          "X-Goog-Resumable": "start",
        },
        data: null,
      })
        .then((res) => {
          setSessionUrl(res.headers.location);
          return uploadResumableUpload(res.headers.location);
        })
        .catch((err) => {
          console.log(err);
        });
    },
    [url]
  );

  const uploadResumableUpload = (url) => {
    if (file) {
      const reader = new FileReader();
      const to = from + chunkSize;
      const blob = file.slice(from, to);
      reader.onload = (e) => {
        const chunk = new Buffer(e.target.result.split(",")[1], "base64");
        setCurrentChunk(chunk);
        return axios({
          url: url || sessionUrl,
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${from.toString()}-${to.toString()}/${
              file.size
            }`,
            "Content-Type": "application/octet-stream",
          },
          data: chunk,
        })
          .then((data) => {
            console.log(data);
          })
          .catch((err) => {
            console.log(err);
          });
      };
      reader.readAsDataURL(blob);
    }
  };

  const handleChunkLastByte = (file, from) => {
    const reader = new FileReader();
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    reader.onload = (e) =>
      setLastChunk(new Buffer(e.target.result.split(",")[1], "base64"));
    reader.readAsDataURL(blob);
  };

  const handleChunkFirstByte = (file) => {
    const reader = new FileReader();
    const to = 0 + chunkSize;
    const blob = file.slice(0, to);
    reader.onload = (e) =>
      setFirstChunk(new Buffer(e.target.result.split(",")[1], "base64"));
    reader.readAsDataURL(blob);
  };

  const handleUpload = useCallback(() => {
    const reader = new FileReader();
    const from = 0 * chunkSize;
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    reader.onload = (e) => uploadForInitialSignedUrlChunk(e.target.result);
    reader.readAsDataURL(blob);
  }, [file, uploadForInitialSignedUrlChunk]);

  const handleFileChangedAndSetLastChunkAndSetLastChunk = (e) => {
    const comingFile = e.target.files[0];
    if (!comingFile) return;
    let startPointer = 0;
    let from = 0;
    let endPointer = comingFile.size;
    while (startPointer < endPointer) {
      let newStartPointer = from + chunkSize;
      if (newStartPointer < endPointer) {
        from = newStartPointer;
      }
      startPointer = newStartPointer;
    }

    handleChunkFirstByte(comingFile);
    handleChunkLastByte(comingFile, from);
    setFile(comingFile);
  };

  const getSignedUrl = () => {
    const nameArr = file.name.replace(/\s/g, "").split(".");
    const newName = `${Date.now()}.${nameArr[nameArr.length - 1]}`;
    axios
      .get(`http://localhost:8080/posts/getSignedUrl?fileName=${newName}`, {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiJ9.amtlbGxpdHQwQHNwb3RpZnkuY29t.Bmkmfp8nbVIYuuS4qjgICmxUDlW3f41M0FHobkAskLo",
        },
      })
      .then((res) => {
        setUrl(res.data.url);
      })
      .catch((err) => console.log(err.message));
  };

  useEffect(() => {
    if (url && file) {
      handleUpload();
    }
  }, [url, file, handleUpload]);

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <input
          type={"file"}
          onChange={handleFileChangedAndSetLastChunkAndSetLastChunk}
        />
        <button onClick={getSignedUrl}>Upload File</button>
      </header>
    </div>
  );
}

export default App;
