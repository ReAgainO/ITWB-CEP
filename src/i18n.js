import * as ReactModule from "react";

// Works with both the CommonJS default interop used by Node and bundler named exports.
const React = ReactModule.default ?? ReactModule;
const { useCallback, useEffect, useState } = React;

export const LANG_STORAGE_KEY = "campus-pass-lang-v1";

// Labels stay in their own language so the switch is always recognizable.
export const LANGUAGES = [
  { id: "zh", label: "中文", nameKey: "lang.zh" },
  { id: "en", label: "EN", nameKey: "lang.en" },
];

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isLanguage = value => value === "zh" || value === "en";

// English and Chinese intentionally share the exact same key set.
export const MESSAGES = {
  en: {
    "meta.title": "Campus Event Pass",
    "meta.description": "Explore an interactive campus event pass demo, or claim and verify a pass with a configured Sepolia deployment.",

    "a11y.skip": "Skip to dashboard",
    "a11y.mainNav": "Main navigation",
    "a11y.appMode": "Application mode",
    "a11y.language": "Language",
    "a11y.switchTo": "Switch to {language}",

    "lang.zh": "Chinese",
    "lang.en": "English",

    "network.demo": "INTERACTIVE DEMO",

    "nav.yourPass": "Your pass",
    "nav.howItWorks": "How it works",

    "mode.demoTitle": "Explore the experience",
    "mode.chainTitle": "Connect to the contract",
    "mode.demoBody": "No wallet. No fees. Try the full journey.",
    "mode.chainBody": "Real testnet transactions require a configured deployment.",
    "mode.chainBody.configured": "Connect your wallet. Claims and check-ins are real Sepolia transactions.",
    "mode.demo": "Demo",
    "mode.sepolia": "Sepolia",

    "hero.eyebrow": "ONE COMMUNITY. ONE VERIFIABLE PASS.",
    "hero.title1": "Show up for",
    "hero.title2": "the ",
    "hero.title3": "next wave.",
    "hero.body": "A campus event pass that belongs to you. Claim your ticket, join the community, and make your attendance verifiable.",
    "hero.meta.event": "Campus Web3 meetup",
    "hero.meta.nft": "Non-transferable ERC-721",
    "hero.connect": "Connect wallet",
    "hero.claim": "Claim your pass",
    "hero.tryClaim": "Try claiming a pass",
    "hero.claimed": "Pass claimed ✓",
    "hero.openDashboard": "Open dashboard",
    "hero.note.demo": "Demo activity is saved in this browser only.",
    "hero.note.chain": "Free to claim. Sepolia test ETH is needed for gas.",
    "hero.stats.demoClaimed": "demo passes claimed",
    "hero.stats.chainClaimed": "on-chain passes claimed",
    "hero.stats.perIdentity": "pass per identity",
    "hero.stats.ownership": "verifiable ownership",

    "common.processing": "Processing…",

    "pass.demoLabel": "DEMO · SIMULATED PASS",
    "pass.chainLabel": "SEPOLIA · TESTNET PASS",
    "pass.attendanceConfirmed": "ATTENDANCE CONFIRMED",
    "pass.readyCheckIn": "READY FOR CHECK-IN",
    "pass.preview": "PASS PREVIEW · CLAIM TO ACTIVATE",
    "pass.caption": "Your identity. Your ticket. Your moment.",
    "pass.animate": "Animate the pass card",

    "dashboard.eyebrow.demo": "A SAFE PLACE TO EXPLORE",
    "dashboard.eyebrow.chain": "YOUR ON-CHAIN ACTIVITY",
    "dashboard.title": "Your event dashboard",
    "dashboard.refresh": "Refresh",

    "demo.banner.title": "Demo mode · Local simulation",
    "demo.banner.body": "Claims and check-ins are stored on this device. These are not NFTs or proof of attendance. No wallet requests, transaction hashes, or blockchain records are created.",
    "demo.profileLabel": "Explore as",
    "demo.reset": "Reset demo",
    "demo.resetStatus": "Demo reset. All local demo passes and activity have been cleared.",

    "profile.organizerName": "Event organizer",

    "role.attendee": "Attendee",
    "role.organizer": "Organizer",
    "role.onSepolia": "{role} · Sepolia",

    "notice.notConfigured.before": "Sepolia mode is not configured for this build. Use Demo to explore, or follow the deployment guide and rebuild with",
    "notice.notConfigured.after": ".",
    "notice.wrongNetwork": "Your wallet is on another network. Connect again to switch to Sepolia.",
    "notice.switchNetwork": "Switch network",
    "notice.storage": "Browser storage is unavailable. This demo still works, but changes may not survive a reload.",
    "chain.contract": "Contract",
    "chain.notDeployed": "Not deployed / configured",

    "card.demoIdentity": "DEMO IDENTITY",
    "card.connectedWallet": "CONNECTED WALLET",
    "card.notConnected": "Not connected",
    "card.networkSwitchNeeded": "Network switch needed",
    "card.connectWallet": "Connect an Ethereum wallet",
    "card.yourDemoPass": "YOUR DEMO PASS",
    "card.yourPass": "YOUR PASS",
    "card.passNumber": "Pass #{id}",
    "card.readyToClaim": "Ready to claim",
    "card.checkedIn": "Checked in ✓",
    "card.waitingCheckIn": "Waiting for check-in",
    "card.onePass": "One pass per identity",
    "card.attendance": "ATTENDANCE",
    "card.onList": "You're on the list.",
    "card.seeYou": "See you there.",
    "card.joinNextWave": "Join the next wave.",
    "card.simulatedAttendance": "Simulated attendance",
    "card.confirmedByOrganizer": "Confirmed by the organizer",
    "card.showPassNumber": "Show your pass number at the door",
    "card.claimToRegister": "Claim a pass to register",

    "status.idle.demo": "Start by claiming a pass. Switch to Event organizer to try checking in your ticket.",
    "status.idle.chain": "Connect your wallet to read your pass and organizer permissions.",
    "status.walletContext": "Wallet context updated. Any submitted transaction continues independently; verify it in your wallet.",
    "status.approveConnection": "Approve the wallet connection and Sepolia network request.",
    "status.walletConnected": "Wallet connected. Sepolia data refreshed.",
    "status.confirm": "Confirm {action} in your wallet.",
    "status.submitted": "Transaction submitted. Waiting for Sepolia confirmation…",
    "status.confirmedRefreshing": "{action} confirmed on Sepolia. Refreshing contract data…",
    "status.confirmed": "{action} confirmed on Sepolia.",
    "status.confirmedRefreshFailed": "{action} confirmed, but the dashboard could not refresh. {error}",
    "status.demoClaimed": "Demo pass claimed. This is a local simulation; no blockchain transaction was sent.",
    "status.demoCheckedIn": "Demo pass #{id} checked in. No blockchain transaction was sent.",
    "status.contractRefreshed": "Contract data refreshed.",
    "status.invalidTicket": "Enter a positive whole ticket number, such as 1.",
    "status.demoTicketMissing": "No demo pass has this number. Claim a pass as an attendee first.",
    "status.demoAlreadyCheckedIn": "This demo pass is already checked in.",
    "status.notOrganizer": "Switch to the organizer profile to check in a guest.",

    "action.claim": "Claim",
    "action.claimProgress": "claim",
    "action.checkIn": "Check-in",
    "action.checkInProgress": "check-in",

    "tx.viewTransaction": "View transaction {hash} on Etherscan ↗",
    "tx.viewPass": "View pass on Etherscan ↗",

    "error.rejected": "Request declined in your wallet. You can try again.",
    "error.alreadyClaimed": "This wallet already owns a pass.",
    "error.alreadyCheckedIn": "This pass is already checked in.",
    "error.ticketDoesNotExist": "This ticket number does not exist.",
    "error.onlyOwner": "Only the contract owner can check in guests.",
    "error.insufficientFunds": "Your wallet needs Sepolia test ETH for the network fee.",
    "error.generic": "Unable to complete the request. Please try again.",
    "error.walletMissing": "Install an Ethereum wallet such as MetaMask to use Sepolia mode. Demo mode works without a wallet.",
    "error.addSepolia": "Add the Sepolia network in your wallet, then connect again.",
    "error.noContract": "No contract exists at the configured address on Sepolia. Check the deployment configuration.",
    "error.accountNetworkChanged": "Wallet account or network changed. Refresh before trying again.",
    "error.accountChanged": "Wallet account changed. Refresh before trying again.",
    "error.txFailed": "Transaction failed on Sepolia.",

    "organizer.eyebrow.demo": "SIMULATED ORGANIZER ACCESS",
    "organizer.eyebrow.chain": "CONTRACT OWNER ACCESS",
    "organizer.title": "Welcome your guests.",
    "organizer.body": "Enter a claimed pass number to record attendance. Each pass can be checked in once.",
    "organizer.body.demo": "Switch back to the attendee profile to see their updated pass.",
    "organizer.body.chain": "Only the contract owner can submit this transaction.",
    "organizer.label": "Pass number",
    "organizer.placeholder": "e.g. 1",
    "organizer.submit": "Check in guest",

    "ledger.eyebrow": "DEMO ACTIVITY · THIS BROWSER ONLY",
    "ledger.title": "The guest list",
    "ledger.count": "{checked} / {total} checked in",
    "ledger.guestPass": "Demo pass #{id}",
    "ledger.checkedIn": "Checked in",
    "ledger.registered": "Registered",
    "ledger.empty": "No demo passes yet. Your first guest starts with a claim.",
    "ledger.activitySummary": "Recent simulated activity",

    "activity.claim": "{name} claimed demo pass #{id}.",
    "activity.checkIn": "Organizer checked in demo pass #{id}.",

    "how.eyebrow": "FROM FIRST CLICK TO CHECK-IN",
    "how.title": "Three steps. You're in.",
    "how.step1Tag": "01 / IDENTIFY",
    "how.step1Title.demo": "Pick a profile",
    "how.step1Title.chain": "Bring your wallet",
    "how.step1Body.demo": "Try an attendee profile, then switch to the organizer. Each profile has its own pass.",
    "how.step1Body.chain": "Connect an Ethereum wallet on Sepolia. Your address identifies your pass.",
    "how.step2Tag": "02 / CLAIM",
    "how.step2Title": "Make it yours",
    "how.step2Body.demo": "Claim a simulated pass with one click. Reload the page and your local progress stays.",
    "how.step2Body.chain": "Confirm a claim transaction. The contract mints one non-transferable ERC-721 pass per wallet.",
    "how.step3Tag": "03 / ATTEND",
    "how.step3Title": "Show up. Check in.",
    "how.step3Body.demo": "Use the organizer profile to check in a claimed pass number. No transaction is sent.",
    "how.step3Body.chain": "The contract owner checks in your pass. Read the attendance status directly from the contract.",

    "footer.brand": "CAMPUS/PASS · EVENT PASS",
    "footer.demo": "Interactive simulation · No blockchain deployment",
    "footer.chain": "Sepolia test network · No real funds required",
  },
  zh: {
    "meta.title": "校园活动通行证",
    "meta.description": "体验互动式校园活动通行证演示，或在已配置的 Sepolia 部署上领取并验证通行证。",

    "a11y.skip": "跳到仪表盘",
    "a11y.mainNav": "主导航",
    "a11y.appMode": "应用模式",
    "a11y.language": "语言",
    "a11y.switchTo": "切换到{language}",

    "lang.zh": "中文",
    "lang.en": "英语",

    "network.demo": "互动演示",

    "nav.yourPass": "你的通行证",
    "nav.howItWorks": "如何运作",

    "mode.demoTitle": "探索完整体验",
    "mode.chainTitle": "连接合约",
    "mode.demoBody": "无需钱包，无需费用，体验完整流程。",
    "mode.chainBody": "真实测试网交易需要先配置部署。",
    "mode.chainBody.configured": "连接钱包。领取和签到会产生真实的 Sepolia 交易。",
    "mode.demo": "演示",
    "mode.sepolia": "Sepolia",

    "hero.eyebrow": "同一个社区，同一张可验证通行证。",
    "hero.title1": "为下一波浪潮，",
    "hero.title2": "如约",
    "hero.title3": "而至。",
    "hero.body": "一张真正属于你的校园活动通行证。领取门票，加入社区，让你的到场可被验证。",
    "hero.meta.event": "校园 Web3 聚会",
    "hero.meta.nft": "不可转让的 ERC-721",
    "hero.connect": "连接钱包",
    "hero.claim": "领取通行证",
    "hero.tryClaim": "试着领取通行证",
    "hero.claimed": "已领取 ✓",
    "hero.openDashboard": "打开仪表盘",
    "hero.note.demo": "演示活动仅保存在此浏览器中。",
    "hero.note.chain": "免费领取，gas 费用需要 Sepolia 测试 ETH。",
    "hero.stats.demoClaimed": "张演示通行证已领取",
    "hero.stats.chainClaimed": "张链上通行证已领取",
    "hero.stats.perIdentity": "每个身份一张通行证",
    "hero.stats.ownership": "可验证的所有权",

    "common.processing": "处理中…",

    "pass.demoLabel": "演示 · 模拟通行证",
    "pass.chainLabel": "SEPOLIA · 测试网通行证",
    "pass.attendanceConfirmed": "已确认到场",
    "pass.readyCheckIn": "等待签到",
    "pass.preview": "通行证预览 · 领取后激活",
    "pass.caption": "你的身份。你的门票。你的时刻。",
    "pass.animate": "播放通行证卡片动画",

    "dashboard.eyebrow.demo": "安心探索的空间",
    "dashboard.eyebrow.chain": "你的链上活动",
    "dashboard.title": "你的活动仪表盘",
    "dashboard.refresh": "刷新",

    "demo.banner.title": "演示模式 · 本地模拟",
    "demo.banner.body": "领取与签到记录都保存在本设备上。这些不是 NFT，也不能作为到场证明。不会发起钱包请求、生成交易哈希或写入区块链记录。",
    "demo.profileLabel": "以谁的身份体验",
    "demo.reset": "重置演示",
    "demo.resetStatus": "演示已重置，所有本地演示通行证和活动记录均已清除。",

    "profile.organizerName": "活动组织者",

    "role.attendee": "参会者",
    "role.organizer": "组织者",
    "role.onSepolia": "{role} · Sepolia",

    "notice.notConfigured.before": "此构建未配置 Sepolia 模式。可使用演示模式体验，或按照部署指南重新构建并设置",
    "notice.notConfigured.after": "。",
    "notice.wrongNetwork": "你的钱包位于其他网络。请重新连接以切换到 Sepolia。",
    "notice.switchNetwork": "切换网络",
    "notice.storage": "浏览器存储不可用。演示仍可运行，但更改可能无法在刷新后保留。",
    "chain.contract": "合约",
    "chain.notDeployed": "未部署 / 未配置",

    "card.demoIdentity": "演示身份",
    "card.connectedWallet": "已连接钱包",
    "card.notConnected": "未连接",
    "card.networkSwitchNeeded": "需要切换网络",
    "card.connectWallet": "连接以太坊钱包",
    "card.yourDemoPass": "你的演示通行证",
    "card.yourPass": "你的通行证",
    "card.passNumber": "通行证 #{id}",
    "card.readyToClaim": "可以领取",
    "card.checkedIn": "已签到 ✓",
    "card.waitingCheckIn": "等待签到",
    "card.onePass": "每个身份仅一张",
    "card.attendance": "到场状态",
    "card.onList": "你已在名单上。",
    "card.seeYou": "现场见。",
    "card.joinNextWave": "加入下一波浪潮。",
    "card.simulatedAttendance": "模拟到场",
    "card.confirmedByOrganizer": "已由组织者确认",
    "card.showPassNumber": "到场时出示通行证编号",
    "card.claimToRegister": "领取通行证即可登记",

    "status.idle.demo": "先领取一张通行证。切换到活动组织者，即可尝试为通行证签到。",
    "status.idle.chain": "连接钱包以读取你的通行证和组织者权限。",
    "status.walletContext": "钱包环境已更新。已提交的交易会独立继续，请在钱包中核实。",
    "status.approveConnection": "请在钱包中批准连接和 Sepolia 网络请求。",
    "status.walletConnected": "钱包已连接，Sepolia 数据已刷新。",
    "status.confirm": "请在钱包中确认{action}。",
    "status.submitted": "交易已提交，正在等待 Sepolia 确认…",
    "status.confirmedRefreshing": "{action}已在 Sepolia 确认，正在刷新合约数据…",
    "status.confirmed": "{action}已在 Sepolia 确认。",
    "status.confirmedRefreshFailed": "{action}已确认，但仪表盘刷新失败。{error}",
    "status.demoClaimed": "演示通行证已领取。这是本地模拟，未发送任何区块链交易。",
    "status.demoCheckedIn": "演示通行证 #{id} 已签到。未发送任何区块链交易。",
    "status.contractRefreshed": "合约数据已刷新。",
    "status.invalidTicket": "请输入正整数通行证编号，例如 1。",
    "status.demoTicketMissing": "没有这个编号的演示通行证。请先以参会者身份领取通行证。",
    "status.demoAlreadyCheckedIn": "这张演示通行证已经签到。",
    "status.notOrganizer": "请切换到组织者身份后再为来宾签到。",

    "action.claim": "领取",
    "action.claimProgress": "领取",
    "action.checkIn": "签到",
    "action.checkInProgress": "签到",

    "tx.viewTransaction": "在 Etherscan 查看交易 {hash} ↗",
    "tx.viewPass": "在 Etherscan 查看通行证 ↗",

    "error.rejected": "钱包请求已被拒绝。你可以重试。",
    "error.alreadyClaimed": "该钱包已拥有一张通行证。",
    "error.alreadyCheckedIn": "该通行证已签到。",
    "error.ticketDoesNotExist": "该通行证编号不存在。",
    "error.onlyOwner": "只有合约所有者可以为来宾签到。",
    "error.insufficientFunds": "你的钱包需要 Sepolia 测试 ETH 支付网络费用。",
    "error.generic": "无法完成请求，请重试。",
    "error.walletMissing": "请安装 MetaMask 等以太坊钱包以使用 Sepolia 模式。演示模式无需钱包。",
    "error.addSepolia": "请在钱包中添加 Sepolia 网络，然后重新连接。",
    "error.noContract": "Sepolia 上配置的地址没有合约。请检查部署配置。",
    "error.accountNetworkChanged": "钱包账户或网络已更改。请刷新后重试。",
    "error.accountChanged": "钱包账户已更改。请刷新后重试。",
    "error.txFailed": "交易在 Sepolia 上失败。",

    "organizer.eyebrow.demo": "模拟组织者权限",
    "organizer.eyebrow.chain": "合约所有者权限",
    "organizer.title": "欢迎你的来宾。",
    "organizer.body": "输入已领取的通行证编号以记录到场。每张通行证只能签到一次。",
    "organizer.body.demo": "切换回参会者身份，即可查看更新后的通行证。",
    "organizer.body.chain": "只有合约所有者可以提交此交易。",
    "organizer.label": "通行证编号",
    "organizer.placeholder": "例如 1",
    "organizer.submit": "为来宾签到",

    "ledger.eyebrow": "演示活动 · 仅限此浏览器",
    "ledger.title": "来宾名单",
    "ledger.count": "{checked} / {total} 已签到",
    "ledger.guestPass": "演示通行证 #{id}",
    "ledger.checkedIn": "已签到",
    "ledger.registered": "已登记",
    "ledger.empty": "还没有演示通行证。你的第一位来宾将从领取开始。",
    "ledger.activitySummary": "最近的模拟活动",

    "activity.claim": "{name} 领取了演示通行证 #{id}。",
    "activity.checkIn": "组织者为演示通行证 #{id} 签到。",

    "how.eyebrow": "从第一次点击到现场签到",
    "how.title": "三步，即刻加入。",
    "how.step1Tag": "01 / 身份",
    "how.step1Title.demo": "选择身份",
    "how.step1Title.chain": "带上钱包",
    "how.step1Body.demo": "先体验参会者身份，再切换到组织者。每个身份都有各自的通行证。",
    "how.step1Body.chain": "在 Sepolia 上连接以太坊钱包。你的地址就是通行证的身份标识。",
    "how.step2Tag": "02 / 领取",
    "how.step2Title": "让它属于你",
    "how.step2Body.demo": "点击一次即可领取模拟通行证。刷新页面后，本地进度依然保留。",
    "how.step2Body.chain": "确认领取交易。合约为每个钱包铸造一张不可转让的 ERC-721 通行证。",
    "how.step3Tag": "03 / 到场",
    "how.step3Title": "到场，签到。",
    "how.step3Body.demo": "使用组织者身份为已领取的通行证编号签到。不会发送交易。",
    "how.step3Body.chain": "由合约所有者为你的通行证签到。到场状态直接读取自合约。",

    "footer.brand": "CAMPUS/PASS · 活动通行证",
    "footer.demo": "互动模拟 · 未部署区块链",
    "footer.chain": "Sepolia 测试网络 · 无需真实资金",
  },
};

export function readLang() {
  try {
    const saved = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    if (typeof saved === "string") {
      const normalized = saved.trim().toLowerCase();
      if (isLanguage(normalized)) return normalized;
    }
  } catch {
    // Storage can be blocked; fall through to the browser preference.
  }
  try {
    const nav = globalThis.navigator;
    const language = nav && typeof nav.language === "string" ? nav.language : "";
    const fallback = language || (nav && Array.isArray(nav.languages) ? nav.languages[0] : "");
    if (typeof fallback === "string" && fallback.trim().toLowerCase().startsWith("zh")) return "zh";
  } catch {
    // Navigator can be unavailable in tests or workers.
  }
  return "en";
}

export function translate(lang, key, vars) {
  const dictionary = isLanguage(lang) && MESSAGES[lang] ? MESSAGES[lang] : MESSAGES.en;
  const selected = has(dictionary, key) ? dictionary[key] : undefined;
  const fallback = has(MESSAGES.en, key) ? MESSAGES.en[key] : undefined;
  const template = typeof selected === "string" ? selected : typeof fallback === "string" ? fallback : undefined;
  if (typeof template !== "string") return key;
  if (!vars) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => (has(vars, name) ? String(vars[name]) : match));
}

export function useLang() {
  const [lang, setLangState] = useState(readLang);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const setLang = useCallback(next => {
    if (isLanguage(next)) setLangState(next);
  }, []);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // A blocked storage quota must not break the switch.
    }
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.title = translate(lang, "meta.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", translate(lang, "meta.description"));
  }, [lang]);

  return { lang, setLang, t };
}
