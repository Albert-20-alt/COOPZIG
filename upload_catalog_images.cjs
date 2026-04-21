const fs = require("fs");
const path = require("path");
const https = require("https");

const SUPABASE_URL = "https://llvmqvydatypyufdwofz.supabase.co";
const ANON_KEY = "sb_publishable_l23O1hOh642b0sWFaY7NlQ_ZERUg794";

// You need a service_role key to bypass RLS for storage uploads.
// Since we only have the anon key, we'll use a workaround:
// Upload to storage with anon key (if bucket is public and RLS allows insert without auth check)
// or update produit with the local path for now.

const imagesToInsert = [
  {
    localFile: path.resolve(__dirname, "public/images/catalog/papaye.jpg"),
    storagePath: "products/papaye.jpg",
    produitNom: "Papaye Solo",
    produitId: "0e0747bc-47a0-4e20-835c-137b452029a1"
  },
  {
    localFile: path.resolve(__dirname, "public/images/catalog/agrumes.jpg"),
    storagePath: "products/agrumes.jpg",
    produitNom: "Agrumes de Casamance",
    produitId: "95fe21c4-ac8a-40b9-9683-212b8c79ec01"
  },
  {
    localFile: path.resolve(__dirname, "public/images/catalog/solom_mains.jpg"),
    storagePath: "products/solom_mains.jpg",
    produitNom: "Solom (Dialium guineense)",
    produitId: "f73fdf56-8e73-4b7b-b32f-53edcc967260"
  },
  {
    localFile: path.resolve(__dirname, "public/images/catalog/madd.jpg"),
    storagePath: "products/madd.jpg",
    produitNom: "Madd (Saba senegalensis)",
    produitId: "ef000835-82af-445a-a570-83f368c3a27e"
  },
  {
    localFile: path.resolve(__dirname, "public/images/catalog/solom_branche.jpg"),
    storagePath: "products/solom_branche.jpg",
    produitNom: "Anacarde (Noix de Cajou)",
    produitId: "b961fff8-403c-4dda-ad13-74e044eb5227"
  },
];

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function uploadFile(localFile, storagePath) {
  const fileBuffer = fs.readFileSync(localFile);
  const ext = path.extname(localFile).slice(1);
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  const uploadUrl = new URL(`${SUPABASE_URL}/storage/v1/object/content-images/${storagePath}`);

  const options = {
    hostname: uploadUrl.hostname,
    path: uploadUrl.pathname,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length,
    }
  };

  const result = await makeRequest(options, fileBuffer);
  console.log(`Upload ${storagePath}: HTTP ${result.status} — ${result.body}`);
  
  if (result.status === 200 || result.status === 201 || result.body.includes("Key")) {
    return `${SUPABASE_URL}/storage/v1/object/public/content-images/${storagePath}`;
  }
  throw new Error(`Upload failed: ${result.body}`);
}

async function updateProductImage(produitId, photoUrl) {
  const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/produits?id=eq.${produitId}`);
  const body = JSON.stringify({ photo_url: photoUrl });
  
  const options = {
    hostname: updateUrl.hostname,
    path: updateUrl.pathname + updateUrl.search,
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    }
  };

  const result = await makeRequest(options, body);
  console.log(`Update product ${produitId}: HTTP ${result.status}`);
  return result;
}

async function main() {
  for (const item of imagesToInsert) {
    console.log(`\n--- Processing: ${item.produitNom} ---`);
    try {
      const publicUrl = await uploadFile(item.localFile, item.storagePath);
      console.log(`✅ Uploaded to: ${publicUrl}`);
      await updateProductImage(item.produitId, publicUrl);
      console.log(`✅ Product updated!`);
    } catch (e) {
      console.error(`❌ Failed for ${item.produitNom}:`, e.message);
    }
  }
  console.log("\n=== Done! ===");
}

main();
