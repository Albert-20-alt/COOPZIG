import { useState } from "react";

export default function BotUploader() {
  const [status, setStatus] = useState("Waiting");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setStatus("Uploading " + files.length + " files...");

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let saveName = file.name;
        // Remap names to something simple just in case based on the size or original name
        if (file.name.includes("66134")) saveName = "papaye.jpg";
        else if (file.name.includes("72682")) saveName = "agrumes.jpg";
        else if (file.name.includes("74477")) saveName = "madd.jpg";
        else if (file.name.includes("79019")) saveName = "solom_branche.jpg";
        else if (file.name.includes("82928")) saveName = "solom_mains.jpg";

        await fetch("/api/upload-bot?name=" + saveName, {
            method: "POST",
            body: file,
            headers: {
                "Content-Type": "application/octet-stream"
            }
        });
    }
    setStatus("Done!");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h1>Bot Uploader</h1>
      <input type="file" multiple id="fileUpload" onChange={handleUpload} />
      <p id="status">{status}</p>
    </div>
  );
}
