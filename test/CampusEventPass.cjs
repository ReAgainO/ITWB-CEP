const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("CampusEventPass", function () {
  let pass;
  let organizer;
  let attendee;
  let secondAttendee;

  beforeEach(async function () {
    [organizer, attendee, secondAttendee] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("CampusEventPass");
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

  it("allows only the organizer to check in a valid ticket once", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await assert.rejects(pass.connect(attendee).checkIn(1), /OwnableUnauthorizedAccount/);
    await assert.rejects(pass.checkIn(99), /TicketDoesNotExist/);
    await (await pass.connect(organizer).checkIn(1)).wait();
    assert.equal(await pass.checkedIn(1), true);
    await assert.rejects(pass.checkIn(1), /AlreadyCheckedIn/);
  });

  it("blocks ticket transfers", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await assert.rejects(
      pass.connect(attendee).transferFrom(attendee.address, secondAttendee.address, 1),
      /TicketIsNonTransferable/
    );
    assert.equal(await pass.ownerOf(1), attendee.address);
  });

  it("blocks both safe-transfer overloads, self-transfer, and approved operators", async function () {
    await (await pass.connect(attendee).claim()).wait();
    const holder = pass.connect(attendee);
    await assert.rejects(holder["safeTransferFrom(address,address,uint256)"](
      attendee.address, secondAttendee.address, 1
    ), /TicketIsNonTransferable/);
    await assert.rejects(holder["safeTransferFrom(address,address,uint256,bytes)"](
      attendee.address, secondAttendee.address, 1, "0x1234"
    ), /TicketIsNonTransferable/);
    await assert.rejects(holder.transferFrom(attendee.address, attendee.address, 1), /TicketIsNonTransferable/);
    // Standard ERC721 approvals remain available but never bypass the transfer restriction.
    await (await holder.approve(secondAttendee.address, 1)).wait();
    assert.equal(await pass.getApproved(1), secondAttendee.address);
    await assert.rejects(pass.connect(secondAttendee).transferFrom(
      attendee.address, secondAttendee.address, 1
    ), /TicketIsNonTransferable/);
    await (await holder.setApprovalForAll(organizer.address, true)).wait();
    await assert.rejects(pass.transferFrom(attendee.address, organizer.address, 1), /TicketIsNonTransferable/);
    assert.equal(await pass.ownerOf(1), attendee.address);
    assert.equal(await pass.ticketOf(secondAttendee.address), 0n);
    assert.equal(await pass.balanceOf(attendee.address), 1n);
    await assert.rejects(pass.connect(secondAttendee).checkIn(1), /OwnableUnauthorizedAccount/);
  });

  it("emits auditable claim and check-in events", async function () {
    const receipt = await (await pass.connect(attendee).claim()).wait();
    const events = receipt.logs.map((log) => pass.interface.parseLog(log)).filter(Boolean);
    const claimed = events.find((event) => event.name === "TicketClaimed");
    assert.equal(claimed.args.attendee, attendee.address);
    assert.equal(claimed.args.tokenId, 1n);
    const checkInReceipt = await (await pass.checkIn(1)).wait();
    const checked = checkInReceipt.logs.map((log) => pass.interface.parseLog(log))
      .find((event) => event.name === "TicketCheckedIn");
    assert.equal(checked.args.tokenId, 1n);
    assert.equal(checked.args.organizer, organizer.address);
    assert.equal(await pass.ticketOf(attendee.address), 1n);
    await assert.rejects(pass.connect(attendee).claim(), /AlreadyClaimed/);
  });

  it("moves organizer privileges on ownership transfer", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await assert.rejects(pass.connect(attendee).transferOwnership(secondAttendee.address), /OwnableUnauthorizedAccount/);
    await assert.rejects(pass.transferOwnership(ethers.ZeroAddress), /OwnableInvalidOwner/);
    await (await pass.transferOwnership(secondAttendee.address)).wait();
    assert.equal(await pass.owner(), secondAttendee.address);
    await assert.rejects(pass.checkIn(1), /OwnableUnauthorizedAccount/);
    await (await pass.connect(secondAttendee).checkIn(1)).wait();
    assert.equal(await pass.checkedIn(1), true);
  });

  it("makes check-in permanently unavailable after explicit ownership renunciation", async function () {
    await (await pass.connect(attendee).claim()).wait();
    await (await pass.renounceOwnership()).wait();
    assert.equal(await pass.owner(), ethers.ZeroAddress);
    await assert.rejects(pass.checkIn(1), /OwnableUnauthorizedAccount/);
    await assert.rejects(pass.connect(attendee).checkIn(1), /OwnableUnauthorizedAccount/);
    assert.equal(await pass.checkedIn(1), false);
    // Claims do not depend on the organizer account.
    await (await pass.connect(secondAttendee).claim()).wait();
    assert.equal(await pass.totalClaims(), 2n);
  });

  it("prevents a receiver callback from claiming a second ticket", async function () {
    const receiver = await (await ethers.getContractFactory("ReentrantClaimReceiver"))
      .deploy(await pass.getAddress());
    await receiver.waitForDeployment();
    await (await receiver.claim()).wait();
    assert.equal(await receiver.duplicateClaimBlocked(), true);
    assert.equal(await pass.totalClaims(), 1n);
    assert.equal(await pass.ticketOf(await receiver.getAddress()), 1n);
    assert.equal(await pass.ownerOf(1), await receiver.getAddress());
  });

  it("rolls back all claim state when a receiver rejects the NFT", async function () {
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

  it("supports ERC721 interfaces and rejects invalid ticket reads", async function () {
    assert.equal(await pass.supportsInterface("0x80ac58cd"), true);
    assert.equal(await pass.supportsInterface("0x5b5e139f"), true);
    assert.equal(await pass.supportsInterface("0x01ffc9a7"), true);
    assert.equal(await pass.supportsInterface("0xffffffff"), false);
    await assert.rejects(pass.ownerOf(0), /ERC721NonexistentToken/);
    await assert.rejects(pass.tokenURI(0), /TicketDoesNotExist/);
    await assert.rejects(pass.checkIn(0), /TicketDoesNotExist/);
    assert.equal(await pass.totalClaims(), 0n);
  });

  it("serves valid on-chain NFT metadata", async function () {
    await (await pass.connect(attendee).claim()).wait();
    const uri = await pass.tokenURI(1);
    assert.match(uri, /^data:application\/json;base64,/);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    assert.equal(metadata.name, "Campus Event Pass #1");
    assert.match(metadata.image, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8");
    assert.match(svg, /^<svg /);
    assert.match(svg, /TICKET #1/);
    assert.match(svg, /<\/svg>$/);
    await assert.rejects(pass.tokenURI(2), /TicketDoesNotExist/);
  });
});
