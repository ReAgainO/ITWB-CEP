const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

function decode(uri) {
  assert.match(uri, /^data:application\/json;base64,/);
  return JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
}
function svgOf(metadata) {
  assert.match(metadata.image, /^data:image\/svg\+xml;base64,/);
  return Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8");
}
const tag = (address) => "0x" + address.slice(-4).toLowerCase();

describe("CampusEventPassV3", function () {
  let pass;
  let organizer;
  let attendee;
  let secondAttendee;

  beforeEach(async function () {
    [organizer, attendee, secondAttendee] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("CampusEventPassV3");
    pass = await factory.deploy();
    await pass.waitForDeployment();
  });

  it("claims one ticket per wallet and records its owner", async function () {
    await (await pass.connect(attendee).claim()).wait();
    assert.equal(await pass.ticketOf(attendee.address), 1n);
    assert.equal(await pass.ownerOf(1), attendee.address);
    assert.equal(await pass.totalClaims(), 1n);
    await assert.rejects(pass.connect(attendee).claim(), /AlreadyClaimed/);

    await (await pass.connect(secondAttendee).claim()).wait();
    assert.equal(await pass.ticketOf(secondAttendee.address), 2n);
    assert.equal(await pass.totalClaims(), 2n);
  });

  it("allows only the organizer to check in once", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await assert.rejects(pass.connect(attendee).checkIn(1), /OwnableUnauthorizedAccount/);
    await assert.rejects(pass.checkIn(99), /TicketDoesNotExist/);
    await (await pass.checkIn(1)).wait();
    assert.equal(await pass.checkedIn(1), true);
    await assert.rejects(pass.checkIn(1), /AlreadyCheckedIn/);
  });

  it("blocks transfers, approvals and self-transfers", async function () {
    await (await pass.connect(attendee).claim()).wait();
    const holder = pass.connect(attendee);
    await assert.rejects(holder.transferFrom(attendee.address, secondAttendee.address, 1), /TicketIsNonTransferable/);
    await assert.rejects(holder["safeTransferFrom(address,address,uint256)"](
      attendee.address, secondAttendee.address, 1
    ), /TicketIsNonTransferable/);
    await assert.rejects(holder.transferFrom(attendee.address, attendee.address, 1), /TicketIsNonTransferable/);
    await (await holder.approve(secondAttendee.address, 1)).wait();
    await assert.rejects(pass.connect(secondAttendee).transferFrom(
      attendee.address, secondAttendee.address, 1
    ), /TicketIsNonTransferable/);
    assert.equal(await pass.ownerOf(1), attendee.address);
  });

  it("serves deterministic, unique on-chain art for each holder", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await (await pass.connect(secondAttendee).claim()).wait();

    const uri1 = await pass.tokenURI(1);
    const uri2 = await pass.tokenURI(2);
    assert.notEqual(uri1, uri2);

    const m1 = decode(uri1);
    const m2 = decode(uri2);
    assert.equal(m1.name, "Campus Event Pass #1");
    assert.equal(m2.name, "Campus Event Pass #2");
    assert.match(m1.description, /Square 1024x1024 artwork generated fully on-chain/);
    assert.equal(m1.attributes.length, 3);
    assert.ok(m1.attributes.some((a) => a.trait_type === "Palette"));
    assert.ok(m1.attributes.some((a) => a.trait_type === "Pattern"));
    assert.equal(m1.attributes.find((a) => a.trait_type === "Ticket").value, "1");

    const svg1 = svgOf(m1);
    const svg2 = svgOf(m2);
    assert.match(svg1, /width='1024' height='1024' viewBox='0 0 1024 1024'/);
    assert.match(svg2, /width='1024' height='1024' viewBox='0 0 1024 1024'/);
    assert.match(svg1, /TICKET #1/);
    assert.match(svg2, /TICKET #2/);
    assert.ok(svg1.includes(tag(attendee.address)));
    assert.ok(svg2.includes(tag(secondAttendee.address)));
    assert.notEqual(svg1, svg2);
    assert.equal(await pass.tokenURI(1), uri1);
  });

  it("renders six well-formed square SVGs across all palettes and patterns", async function () {
    const signers = await ethers.getSigners();
    const seen = new Set();
    for (let i = 1; i <= 6; i++) {
      await (await pass.connect(signers[i]).claim()).wait();
      const metadata = decode(await pass.tokenURI(i));
      const svg = svgOf(metadata);
      assert.match(svg, /width='1024' height='1024' viewBox='0 0 1024 1024'/);
      assert.match(svg, new RegExp(`TICKET #${i}`));
      assert.ok(svg.includes(tag(signers[i].address)));
      assert.equal((svg.match(/'/g) || []).length % 2, 0, `unbalanced quotes in token ${i}`);
      seen.add(metadata.attributes.find((a) => a.trait_type === "Pattern").value);
    }
    assert.ok(seen.size >= 2);
    assert.equal(await pass.totalClaims(), 6n);
  });

  it("supports per-token external metadata with on-chain fallback", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await (await pass.connect(secondAttendee).claim()).wait();
    const onchain = await pass.tokenURI(1);
    const external = "ipfs://bafybeigdyrzt5example/1.json";

    await assert.rejects(pass.connect(attendee).setExternalTokenURI(1, external), /OwnableUnauthorizedAccount/);
    await assert.rejects(pass.setExternalTokenURI(99, external), /TicketDoesNotExist/);

    const receipt = await (await pass.setExternalTokenURI(1, external)).wait();
    const event = receipt.logs.map((log) => pass.interface.parseLog(log)).filter(Boolean)
      .find((entry) => entry.name === "ExternalTokenURIUpdated");
    assert.equal(event.args.tokenId, 1n);
    assert.equal(event.args.uri, external);
    assert.equal(await pass.tokenURI(1), external);
    assert.equal(await pass.externalTokenURI(1), external);
    assert.match(await pass.tokenURI(2), /^data:application\/json;base64,/);
    assert.notEqual(await pass.tokenURI(2), external);

    await (await pass.setExternalTokenURI(1, "")).wait();
    assert.equal(await pass.tokenURI(1), onchain);
  });

  it("rejects metadata for missing tokens", async function () {
    await assert.rejects(pass.tokenURI(0), /TicketDoesNotExist/);
    await assert.rejects(pass.tokenURI(99), /TicketDoesNotExist/);
  });

  it("supports ERC721 interfaces", async function () {
    assert.equal(await pass.supportsInterface("0x80ac58cd"), true);
    assert.equal(await pass.supportsInterface("0x5b5e139f"), true);
    assert.equal(await pass.supportsInterface("0x01ffc9a7"), true);
    assert.equal(await pass.supportsInterface("0xffffffff"), false);
  });

  it("blocks a receiver callback from claiming twice", async function () {
    const receiver = await (await ethers.getContractFactory("ReentrantClaimReceiver"))
      .deploy(await pass.getAddress());
    await receiver.waitForDeployment();
    await (await receiver.claim()).wait();
    assert.equal(await receiver.duplicateClaimBlocked(), true);
    assert.equal(await pass.totalClaims(), 1n);
    assert.equal(await pass.ownerOf(1), await receiver.getAddress());
  });

  it("rolls back claim state when a receiver rejects the NFT", async function () {
    const receiver = await (await ethers.getContractFactory("RejectingClaimReceiver"))
      .deploy(await pass.getAddress());
    await receiver.waitForDeployment();
    await assert.rejects(receiver.claim(), /Ticket rejected/);
    assert.equal(await pass.ticketOf(await receiver.getAddress()), 0n);
    assert.equal(await pass.totalClaims(), 0n);
    assert.equal(await pass.nextTokenId(), 1n);
    await (await pass.connect(attendee).claim()).wait();
    assert.equal(await pass.ownerOf(1), attendee.address);
  });
});
