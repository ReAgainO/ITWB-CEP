const fs = require("node:fs/promises");
const path = require("node:path");
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const pass = await (await ethers.getContractFactory("CampusEventPassV2")).deploy();
  await pass.waitForDeployment();
  const outDir = path.resolve(__dirname, "..", "samples");
  await fs.mkdir(outDir, { recursive: true });
  const rows = [];
  for (let i = 1; i <= 6; i++) {
    await (await pass.connect(signers[i]).claim()).wait();
    const uri = await pass.tokenURI(i);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8");
    await fs.writeFile(path.join(outDir, `token-${i}.svg`), svg);
    rows.push({ id: i, holder: signers[i].address, attributes: metadata.attributes });
  }
  await fs.writeFile(path.join(outDir, "traits.json"), JSON.stringify(rows, null, 2) + "\n");
  const cards = rows.map((row) => `<figure><img src="token-${row.id}.svg" alt="Token ${row.id}"><figcaption>#${row.id} · ${row.holder.slice(0, 8)}… · ${row.attributes.map(a => a.value).join(" / ")}</figcaption></figure>`).join("\n");
  await fs.writeFile(path.join(outDir, "index.html"), `<!doctype html><meta charset="utf-8"><style>body{background:#111;color:#ddd;font:13px Arial;margin:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{width:100%;display:block;border-radius:12px;border:1px solid #333}figcaption{padding:8px 2px;color:#bbb}</style>${cards}</html>`);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
