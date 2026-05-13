"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main/api-client.ts
function sanitizeErrorMessage(msg) {
  if (!msg)
    return msg;
  return msg.replace(/https?:\/\/[^\s"')]*?(?=\/|\s|$|["'),])([^\s"')]*)/g, (_m, rest) => rest || "").replace(/(?:^|[\s"'(])([a-z0-9.-]+\.mtsk\.app)(?=[\s/"'),:])/gi, (m, host) => m.replace(host, ""));
}
function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(import_config.API_BASE_URL + urlPath);
    const isHttps = fullUrl.protocol === "https:";
    const transport = isHttps ? import_https.default : import_http.default;
    const bodyStr = body ? JSON.stringify(body) : void 0;
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? "443" : "80"),
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...token ? { Authorization: `Bearer ${token}` } : {},
        ...bodyStr ? { "Content-Length": String(Buffer.byteLength(bodyStr)) } : {}
      }
    };
    const sanitize = sanitizeErrorMessage;
    const req = transport.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            resolve(parsed);
          } else {
            reject(new Error(sanitize(parsed?.message || `HTTP ${status}`)));
          }
        } catch {
          reject(new Error("Sunucudan ge\xE7ersiz yan\u0131t al\u0131nd\u0131."));
        }
      });
    });
    req.on("error", (err) => {
      const msg = err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT" || err.code === "ECONNRESET" ? "Sunucuya ula\u015F\u0131lam\u0131yor. \u0130nternet ba\u011Flant\u0131n\u0131z\u0131 kontrol edin." : sanitize(err.message || "Ba\u011Flant\u0131 hatas\u0131.");
      reject(new Error(msg));
    });
    req.setTimeout(1e4, () => {
      req.destroy();
      reject(new Error("Sunucu yan\u0131t vermedi (zaman a\u015F\u0131m\u0131)."));
    });
    if (bodyStr)
      req.write(bodyStr);
    req.end();
  });
}
var import_http, import_https, import_config, apiClient;
var init_api_client = __esm({
  "src/main/api-client.ts"() {
    "use strict";
    import_http = __toESM(require("http"));
    import_https = __toESM(require("https"));
    import_config = require("bootstrap:config");
    apiClient = {
      login: (email, password) => request("POST", "/desktop/desktop-service/auth/login", { email, password }),
      logout: (token) => request("POST", "/desktop/desktop-service/auth/logout", void 0, token),
      getMySchool: (token) => request("GET", "/desktop/desktop-service/driving-school/me", void 0, token),
      getMebbisAccounts: (token) => request("GET", "/desktop/desktop-service/driving-school/me/mebbis-accounts", void 0, token),
      getAllSchools: (token) => request("GET", "/desktop/desktop-service/driving-school/all", void 0, token),
      upsertMebbisAccount: (token, schoolId, data) => request("POST", `/desktop/desktop-service/driving-school/me/mebbis-accounts/${schoolId}`, data, token),
      removeMebbisAccount: (token, schoolId) => request("DELETE", `/desktop/desktop-service/driving-school/me/mebbis-accounts/${schoolId}`, void 0, token),
      setupSchool: (token, name) => request("POST", "/desktop/desktop-service/driving-school/me/setup", { name }, token),
      forgotPassword: (email, phone) => request("POST", "/desktop/desktop-service/auth/forgot-password", { email, phone }),
      verifyResetCode: (email, code) => request("POST", "/desktop/desktop-service/auth/verify-reset-code", { email, code }),
      resetPassword: (email, code, newPassword) => request("POST", "/desktop/desktop-service/auth/reset-password", { email, code, newPassword }),
      logActivity: (token, body) => request("POST", "/desktop/desktop-service/activity-log", body, token),
      getProfile: (token) => request("GET", "/desktop/desktop-service/auth/profile", void 0, token),
      updateProfile: (token, phone) => request("PATCH", "/desktop/desktop-service/auth/profile", { phone }, token),
      // ── Student store ───────────────────────────────────────────────
      listStudents: (token) => request("GET", "/desktop/desktop-service/student-store/students", void 0, token),
      getStudent: (token, tc) => request("GET", `/desktop/desktop-service/student-store/students/${encodeURIComponent(tc)}`, void 0, token),
      listCars: (token) => request("GET", "/desktop/desktop-service/student-store/cars", void 0, token),
      updateCarRoute: (token, carId, route) => request(
        "PATCH",
        `/desktop/desktop-service/student-store/cars/${carId}/route`,
        { route },
        token
      ),
      ingestStudentList: (token, mebbisAccountId, rows) => request(
        "POST",
        "/desktop/desktop-service/student-store/students/list",
        { mebbis_account_id: mebbisAccountId, rows },
        token
      ),
      ingestStudentDetail: (token, mebbisAccountId, payload) => request(
        "POST",
        "/desktop/desktop-service/student-store/students/detail",
        { mebbis_account_id: mebbisAccountId, payload },
        token
      ),
      // ── Personnel store ─────────────────────────────────────────────
      ingestPersonnelList: (token, mebbisAccountId, rows) => request(
        "POST",
        "/desktop/desktop-service/personnel-store/personnel/list",
        { mebbis_account_id: mebbisAccountId, rows },
        token
      ),
      ingestPersonnelDetail: (token, mebbisAccountId, payload) => request(
        "POST",
        "/desktop/desktop-service/personnel-store/personnel/detail",
        { mebbis_account_id: mebbisAccountId, payload },
        token
      ),
      // ── Kurum info store ────────────────────────────────────────────
      getKurumInfo: (token) => request("GET", "/desktop/desktop-service/kurum-info-store/info", void 0, token),
      ingestKurumInfo: (token, mebbisAccountId, payload) => request(
        "POST",
        "/desktop/desktop-service/kurum-info-store/info",
        { mebbis_account_id: mebbisAccountId, payload },
        token
      )
    };
  }
});

// src/main/student-db.ts
var student_db_exports = {};
__export(student_db_exports, {
  StudentDb: () => StudentDb,
  getStudentDb: () => getStudentDb
});
function getStudentDb() {
  if (!_instance)
    _instance = new StudentDb();
  return _instance;
}
var import_electron2, fs2, path2, FILE_NAME, PLAINTEXT_FALLBACK_NAME, StudentDb, _instance;
var init_student_db = __esm({
  "src/main/student-db.ts"() {
    "use strict";
    import_electron2 = require("electron");
    fs2 = __toESM(require("fs"));
    path2 = __toESM(require("path"));
    FILE_NAME = "student-store.enc";
    PLAINTEXT_FALLBACK_NAME = "student-store.json";
    StudentDb = class {
      constructor() {
        this.data = { version: 2, accounts: {} };
        this.dirty = false;
        this.flushTimer = null;
        this.encPath = path2.join(import_electron2.app.getPath("userData"), FILE_NAME);
        this.plainPath = path2.join(import_electron2.app.getPath("userData"), PLAINTEXT_FALLBACK_NAME);
        this.load();
      }
      load() {
        try {
          if (fs2.existsSync(this.encPath) && import_electron2.safeStorage.isEncryptionAvailable()) {
            const buf = fs2.readFileSync(this.encPath);
            const json = import_electron2.safeStorage.decryptString(buf);
            const parsed = JSON.parse(json);
            if (parsed && parsed.accounts) {
              this.data = this.migrate(parsed);
              console.log(`[StudentDb] Loaded encrypted DB from ${this.encPath} \u2014 accounts=${Object.keys(this.data.accounts).length}`);
              return;
            }
          }
          if (fs2.existsSync(this.plainPath)) {
            const json = fs2.readFileSync(this.plainPath, "utf-8");
            const parsed = JSON.parse(json);
            if (parsed && parsed.accounts) {
              this.data = this.migrate(parsed);
              console.log(`[StudentDb] Loaded plaintext fallback from ${this.plainPath} \u2014 accounts=${Object.keys(this.data.accounts).length}`);
              return;
            }
          }
          console.log(`[StudentDb] No existing DB found, starting fresh`);
        } catch (e) {
          console.error(`[StudentDb] Load failed, starting fresh:`, e);
          this.data = { version: 2, accounts: {} };
        }
      }
      /** Forward-compat migration. v1 records had only {tc, adSoyad, plates, lastSeenAt}. */
      migrate(parsed) {
        const out = { version: 2, accounts: {} };
        for (const [accId, bucket] of Object.entries(parsed.accounts || {})) {
          const students = {};
          for (const [tc, raw] of Object.entries(bucket.students || {})) {
            students[tc] = {
              tc: raw.tc || tc,
              adSoyad: raw.adSoyad || "",
              plates: Array.isArray(raw.plates) ? raw.plates : [],
              hasDetail: !!raw.hasDetail,
              lastSeenAt: raw.lastSeenAt || Date.now(),
              lastListSeenAt: raw.lastListSeenAt,
              lastDetailSeenAt: raw.lastDetailSeenAt,
              donemi: raw.donemi,
              grubu: raw.grubu,
              subesi: raw.subesi,
              durumu: raw.durumu,
              listRowRaw: raw.listRowRaw,
              kurum: raw.kurum,
              mevcutBelge: raw.mevcutBelge,
              istenenSertifika: raw.istenenSertifika,
              kurumOnay: raw.kurumOnay,
              ilceOnay: raw.ilceOnay,
              uygulama: raw.uygulama,
              teorikHak: raw.teorikHak,
              uygulamaHak: raw.uygulamaHak,
              eSinavHak: raw.eSinavHak,
              kayitUcreti: raw.kayitUcreti,
              exams: raw.exams,
              lessons: raw.lessons
            };
          }
          out.accounts[accId] = {
            students,
            plates: Array.isArray(bucket.plates) ? bucket.plates : []
          };
        }
        return out;
      }
      getBucket(accountId) {
        let b = this.data.accounts[accountId];
        if (!b) {
          b = { students: {}, plates: [] };
          this.data.accounts[accountId] = b;
        }
        return b;
      }
      /** Bulk-ingest from skt02006 list. Never downgrades hasDetail. */
      ingestList(accountId, rows) {
        const bucket = this.getBucket(accountId);
        const now = Date.now();
        let created = 0;
        let updated = 0;
        for (const row of rows) {
          if (!row.tc || !/^\d{11}$/.test(row.tc))
            continue;
          const existing = bucket.students[row.tc];
          if (existing) {
            existing.adSoyad = row.adSoyad || existing.adSoyad;
            if (row.donemi)
              existing.donemi = row.donemi;
            if (row.grubu)
              existing.grubu = row.grubu;
            if (row.subesi)
              existing.subesi = row.subesi;
            if (row.durumu)
              existing.durumu = row.durumu;
            if (row.listRowRaw)
              existing.listRowRaw = row.listRowRaw;
            existing.lastListSeenAt = now;
            existing.lastSeenAt = now;
            updated++;
          } else {
            bucket.students[row.tc] = {
              tc: row.tc,
              adSoyad: row.adSoyad,
              donemi: row.donemi,
              grubu: row.grubu,
              subesi: row.subesi,
              durumu: row.durumu,
              listRowRaw: row.listRowRaw,
              plates: [],
              hasDetail: false,
              lastListSeenAt: now,
              lastSeenAt: now
            };
            created++;
          }
        }
        if (created || updated)
          this.markDirty();
        return { created, updated };
      }
      /** Ingest full detail from skt02009. Marks hasDetail=true, merges plates from exams+lessons. */
      ingestDetail(accountId, data) {
        const bucket = this.getBucket(accountId);
        const now = Date.now();
        if (!data.tc || !/^\d{11}$/.test(data.tc)) {
          return { studentIsNew: false, newPlatesForStudent: [], newPlatesForAccount: [] };
        }
        const newPlatesFromDetail = Array.from(new Set([
          ...data.exams.map((e) => e.plaka),
          ...data.lessons.map((l) => l.plaka)
        ].filter(Boolean)));
        let studentIsNew = false;
        let newPlatesForStudent = [];
        const existing = bucket.students[data.tc];
        if (existing) {
          const before = new Set(existing.plates);
          const merged = Array.from(/* @__PURE__ */ new Set([...existing.plates, ...newPlatesFromDetail]));
          newPlatesForStudent = merged.filter((p) => !before.has(p));
          existing.adSoyad = data.adSoyad || existing.adSoyad;
          existing.kurum = data.kurum;
          if (data.donemi)
            existing.donemi = data.donemi;
          if (data.grubu)
            existing.grubu = data.grubu;
          if (data.subesi)
            existing.subesi = data.subesi;
          existing.mevcutBelge = data.mevcutBelge;
          existing.istenenSertifika = data.istenenSertifika;
          existing.kurumOnay = data.kurumOnay;
          existing.ilceOnay = data.ilceOnay;
          existing.uygulama = data.uygulama;
          if (data.durumu)
            existing.durumu = data.durumu;
          existing.teorikHak = data.teorikHak;
          existing.uygulamaHak = data.uygulamaHak;
          existing.eSinavHak = data.eSinavHak;
          existing.kayitUcreti = data.kayitUcreti;
          existing.exams = data.exams;
          existing.lessons = data.lessons;
          existing.plates = merged;
          existing.hasDetail = true;
          existing.lastDetailSeenAt = now;
          existing.lastSeenAt = now;
        } else {
          studentIsNew = true;
          newPlatesForStudent = [...newPlatesFromDetail];
          bucket.students[data.tc] = {
            tc: data.tc,
            adSoyad: data.adSoyad,
            kurum: data.kurum,
            donemi: data.donemi,
            grubu: data.grubu,
            subesi: data.subesi,
            mevcutBelge: data.mevcutBelge,
            istenenSertifika: data.istenenSertifika,
            kurumOnay: data.kurumOnay,
            ilceOnay: data.ilceOnay,
            uygulama: data.uygulama,
            durumu: data.durumu,
            teorikHak: data.teorikHak,
            uygulamaHak: data.uygulamaHak,
            eSinavHak: data.eSinavHak,
            kayitUcreti: data.kayitUcreti,
            exams: data.exams,
            lessons: data.lessons,
            plates: [...newPlatesFromDetail],
            hasDetail: true,
            lastDetailSeenAt: now,
            lastSeenAt: now
          };
        }
        const plateSet = new Set(bucket.plates);
        const newPlatesForAccount = [];
        for (const p of newPlatesFromDetail) {
          if (!plateSet.has(p)) {
            plateSet.add(p);
            newPlatesForAccount.push(p);
          }
        }
        bucket.plates = Array.from(plateSet);
        this.markDirty();
        return { studentIsNew, newPlatesForStudent, newPlatesForAccount };
      }
      serialize(accountId) {
        const bucket = this.getBucket(accountId);
        const students = Object.values(bucket.students).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
        const plates = [...bucket.plates].sort();
        return { students, plates };
      }
      getStudent(accountId, tc) {
        return this.getBucket(accountId).students[tc] || null;
      }
      clearAccount(accountId) {
        if (this.data.accounts[accountId]) {
          delete this.data.accounts[accountId];
          this.markDirty();
          console.log(`[StudentDb] Cleared account ${accountId}`);
        }
      }
      countStudents(accountId) {
        return Object.keys(this.getBucket(accountId).students).length;
      }
      countDetailed(accountId) {
        return Object.values(this.getBucket(accountId).students).filter((s) => s.hasDetail).length;
      }
      countPlates(accountId) {
        return this.getBucket(accountId).plates.length;
      }
      markDirty() {
        this.dirty = true;
        if (this.flushTimer)
          return;
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.flush();
        }, 500);
      }
      flush() {
        if (!this.dirty)
          return;
        try {
          const json = JSON.stringify(this.data);
          if (import_electron2.safeStorage.isEncryptionAvailable()) {
            const buf = import_electron2.safeStorage.encryptString(json);
            fs2.writeFileSync(this.encPath, buf);
            try {
              if (fs2.existsSync(this.plainPath))
                fs2.unlinkSync(this.plainPath);
            } catch {
            }
            console.log(`[StudentDb] Flushed encrypted DB (${buf.length} bytes)`);
          } else {
            fs2.writeFileSync(this.plainPath, json, "utf-8");
            console.log(`[StudentDb] Flushed plaintext fallback (safeStorage unavailable)`);
          }
          this.dirty = false;
        } catch (e) {
          console.error(`[StudentDb] Flush failed:`, e);
        }
      }
    };
    _instance = null;
  }
});

// src/main/kurum-info-sync.ts
var kurum_info_sync_exports = {};
__export(kurum_info_sync_exports, {
  configureKurumInfoSync: () => configureKurumInfoSync,
  fetchKurumInfo: () => fetchKurumInfo,
  pushKurumInfo: () => pushKurumInfo
});
function configureKurumInfoSync(getToken) {
  _getToken3 = getToken;
}
function tokenOrNull3() {
  try {
    return _getToken3();
  } catch {
    return null;
  }
}
function pushKurumInfo(mebbisAccountId, payload) {
  const token = tokenOrNull3();
  if (!token) {
    console.log("[KurumInfoSync] No auth token, skipping push");
    return Promise.resolve(null);
  }
  return apiClient.ingestKurumInfo(token, mebbisAccountId, payload).then((r) => {
    console.log(`[KurumInfoSync] Pushed (account=${mebbisAccountId}): info_id=${r.kurum_info_id}, programs=${r.programs}, vehicles=${r.vehicles}`);
    return r;
  }).catch((e) => {
    console.error("[KurumInfoSync] Push failed:", e?.message || e);
    return null;
  });
}
function fetchKurumInfo() {
  const token = tokenOrNull3();
  if (!token) {
    console.log("[KurumInfoSync] No auth token, skipping fetch");
    return Promise.resolve(null);
  }
  return apiClient.getKurumInfo(token).catch((e) => {
    console.error("[KurumInfoSync] Fetch failed:", e?.message || e);
    return null;
  });
}
var _getToken3;
var init_kurum_info_sync = __esm({
  "src/main/kurum-info-sync.ts"() {
    "use strict";
    init_api_client();
    _getToken3 = () => null;
  }
});

// src/main/app-controller.ts
var app_controller_exports = {};
__export(app_controller_exports, {
  start: () => start
});
module.exports = __toCommonJS(app_controller_exports);
var import_electron7 = require("electron");

// src/main/auth-store.ts
var import_electron = require("electron");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var AuthStore = class {
  constructor() {
    this.data = null;
    this.filePath = path.join(import_electron.app.getPath("userData"), "auth.json");
    this.load();
  }
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      }
    } catch {
      this.data = null;
    }
  }
  save(token, user) {
    const savedSchoolName = this.data?.savedSchoolName;
    const savedPasswordCipher = this.data?.savedPasswordCipher;
    const autoLogin = this.data?.autoLogin;
    this.data = { token, user, savedEmail: user.email, savedSchoolName, savedPasswordCipher, autoLogin };
    this.persist();
  }
  persist() {
    try {
      if (this.data) {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
      }
    } catch {
    }
  }
  /** Stores the password encrypted-at-rest. Pass null to forget it. */
  setRememberedPassword(password) {
    if (!this.data) {
      this.data = { token: "", user: null };
    }
    if (password === null || password === "") {
      delete this.data.savedPasswordCipher;
    } else {
      try {
        if (import_electron.safeStorage.isEncryptionAvailable()) {
          this.data.savedPasswordCipher = "ss:" + import_electron.safeStorage.encryptString(password).toString("base64");
        } else {
          this.data.savedPasswordCipher = "b64:" + Buffer.from(password, "utf-8").toString("base64");
        }
      } catch {
      }
    }
    this.persist();
  }
  getRememberedPassword() {
    const cipher = this.data?.savedPasswordCipher;
    if (!cipher)
      return null;
    try {
      if (cipher.startsWith("ss:")) {
        if (!import_electron.safeStorage.isEncryptionAvailable())
          return null;
        return import_electron.safeStorage.decryptString(Buffer.from(cipher.slice(3), "base64"));
      }
      if (cipher.startsWith("b64:")) {
        return Buffer.from(cipher.slice(4), "base64").toString("utf-8");
      }
    } catch {
    }
    return null;
  }
  setAutoLogin(value) {
    if (!this.data) {
      this.data = { token: "", user: null };
    }
    this.data.autoLogin = !!value;
    this.persist();
  }
  getAutoLogin() {
    return this.data?.autoLogin === true;
  }
  setSavedSchoolName(name) {
    if (!name)
      return;
    if (!this.data) {
      this.data = { token: "", user: null, savedSchoolName: name };
    } else {
      this.data.savedSchoolName = name;
    }
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
    }
  }
  clear() {
    const savedEmail = this.data?.savedEmail ?? this.data?.user?.email ?? null;
    const savedSchoolName = this.data?.savedSchoolName ?? null;
    const savedPasswordCipher = this.data?.savedPasswordCipher;
    this.data = savedEmail || savedSchoolName || savedPasswordCipher ? {
      token: "",
      user: null,
      savedEmail: savedEmail || void 0,
      savedSchoolName: savedSchoolName || void 0,
      savedPasswordCipher,
      autoLogin: false
    } : null;
    try {
      if (this.data) {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
      } else {
        fs.unlinkSync(this.filePath);
      }
    } catch {
    }
  }
  getToken() {
    return this.data?.token || null;
  }
  getUser() {
    return this.data?.user ?? null;
  }
  getSavedEmail() {
    return this.data?.savedEmail ?? null;
  }
  getSavedSchoolName() {
    return this.data?.savedSchoolName ?? null;
  }
};

// src/main/student-sync.ts
init_api_client();
init_student_db();
var _getToken = () => null;
var _accountIdResolver = () => null;
function configureStudentSync(getToken, accountIdResolver) {
  _getToken = getToken;
  _accountIdResolver = accountIdResolver;
}
function tokenOrNull() {
  try {
    return _getToken();
  } catch {
    return null;
  }
}
function pushList(mebbisAccountId, rows) {
  const token = tokenOrNull();
  if (!token) {
    console.log("[StudentSync] No auth token, skipping list push");
    return;
  }
  if (!rows.length)
    return;
  apiClient.ingestStudentList(token, mebbisAccountId, rows).then((r) => {
    console.log(`[StudentSync] List pushed (account=${mebbisAccountId}): created=${r.created}, updated=${r.updated}`);
  }).catch((e) => {
    console.error(`[StudentSync] List push failed (kept locally):`, e?.message || e);
  });
}
function pushDetail(mebbisAccountId, payload) {
  const token = tokenOrNull();
  if (!token) {
    console.log("[StudentSync] No auth token, skipping detail push");
    return;
  }
  apiClient.ingestStudentDetail(token, mebbisAccountId, payload).then((r) => {
    console.log(`[StudentSync] Detail pushed: tc=${payload.tc} ${r.studentIsNew ? "(NEW)" : "(UPDATE)"} mebbis_id=${r.mebbis_id}`);
  }).catch((e) => {
    console.error(`[StudentSync] Detail push failed (kept locally):`, e?.message || e);
  });
}
async function pullAll() {
  const token = tokenOrNull();
  if (!token) {
    console.log("[StudentSync] No auth token, skipping pull");
    return;
  }
  const accountId = _accountIdResolver() || "";
  if (!accountId) {
    console.log("[StudentSync] No account resolver, skipping pull");
    return;
  }
  console.log("[StudentSync] Pulling students from backend...");
  let students = [];
  try {
    students = await apiClient.listStudents(token);
  } catch (e) {
    console.error("[StudentSync] Pull (list) failed:", e?.message || e);
    return;
  }
  console.log(`[StudentSync] Backend returned ${students.length} students`);
  const db = getStudentDb();
  const listRows = students.map((s) => ({
    tc: s.tc,
    adSoyad: s.ad_soyad,
    donem: s.donem || void 0,
    grup: s.grup || void 0,
    sube: s.sube || void 0,
    durum: s.durum || void 0
  }));
  if (listRows.length) {
    db.ingestList(accountId, listRows);
  }
  let detailsPulled = 0;
  for (const remote of students) {
    if (!remote.has_detail)
      continue;
    const local = db.serialize(accountId).students.find((s) => s.tc === remote.tc);
    if (local && local.hasDetail)
      continue;
    try {
      const full = await apiClient.getStudent(token, remote.tc);
      if (full?.mebbis?.has_detail) {
        const m = full.mebbis;
        db.ingestDetail(accountId, {
          tc: full.tc_number,
          adSoyad: full.name,
          kurum: m.kurum,
          donemi: m.donem,
          grubu: m.grup,
          subesi: m.sube,
          mevcutBelge: m.mevcut_belge,
          istenenSertifika: m.istenen_sertifika,
          kurumOnay: m.kurum_onay,
          ilceOnay: m.ilce_onay,
          uygulama: m.uygulama,
          durumu: m.durum,
          teorikHak: m.teorik_hak,
          uygulamaHak: m.uygulama_hak,
          eSinavHak: m.esinav_hak,
          kayitUcreti: m.kayit_ucreti,
          exams: (m.exams || []).map((e) => ({
            donemi: e.donem || "",
            sinavKodu: e.sinav_kodu || "",
            sinavTarihi: e.sinav_tarihi || "",
            plaka: e.plaka || "",
            ustaOgretici: e.usta_ogretici || "",
            onayDurumu: e.onay_durumu || "",
            sinavDurumu: e.sinav_durumu || "",
            sonuc: e.sonuc || ""
          })),
          lessons: (m.lessons || []).map((l) => ({
            donemi: l.donem || "",
            grupAdi: l.grup_adi || "",
            grupBaslama: l.grup_baslama || "",
            subesi: l.sube || "",
            plaka: l.plaka || "",
            dersYeri: l.ders_yeri || "",
            dersTarihi: l.ders_tarihi || "",
            dersSaati: l.ders_saati || "",
            personel: l.personel || "",
            egitimTuru: l.egitim_turu || ""
          }))
        });
        detailsPulled++;
      }
    } catch (e) {
      console.error(`[StudentSync] Pull detail tc=${remote.tc} failed:`, e?.message || e);
    }
  }
  console.log(`[StudentSync] Pull complete: ${listRows.length} list rows, ${detailsPulled} details merged`);
}

// src/main/personnel-sync.ts
init_api_client();
var _getToken2 = () => null;
function configurePersonnelSync(getToken) {
  _getToken2 = getToken;
}
function tokenOrNull2() {
  try {
    return _getToken2();
  } catch {
    return null;
  }
}
function pushPersonnelList(mebbisAccountId, rows) {
  const token = tokenOrNull2();
  if (!token) {
    console.log("[PersonnelSync] No auth token, skipping list push");
    return;
  }
  if (!rows.length)
    return;
  apiClient.ingestPersonnelList(token, mebbisAccountId, rows).then((r) => {
    console.log(`[PersonnelSync] List pushed (account=${mebbisAccountId}): created=${r.created}, updated=${r.updated}, linked=${r.linked}`);
  }).catch((e) => {
    console.error("[PersonnelSync] List push failed (kept locally):", e?.message || e);
  });
}
function pushPersonnelDetail(mebbisAccountId, payload) {
  const token = tokenOrNull2();
  if (!token) {
    console.log("[PersonnelSync] No auth token, skipping detail push");
    return;
  }
  apiClient.ingestPersonnelDetail(token, mebbisAccountId, payload).then((r) => {
    console.log(`[PersonnelSync] Detail pushed: tc=${payload.tc} personnel_id=${r.personnel_id}`);
  }).catch((e) => {
    console.error("[PersonnelSync] Detail push failed (kept locally):", e?.message || e);
  });
}

// src/main/app-controller.ts
init_kurum_info_sync();

// src/main/car-sync.ts
init_api_client();
var _getToken4 = () => null;
function configureCarSync(getToken) {
  _getToken4 = getToken;
}
function tokenOrNull4() {
  try {
    return _getToken4();
  } catch {
    return null;
  }
}
function fetchCars() {
  const token = tokenOrNull4();
  if (!token)
    return Promise.resolve(null);
  return apiClient.listCars(token).catch((e) => {
    console.error("[CarSync] fetchCars failed:", e?.message || e);
    return null;
  });
}
function updateCarRoute(carId, route) {
  const token = tokenOrNull4();
  if (!token)
    return Promise.resolve();
  return apiClient.updateCarRoute(token, carId, route).then(() => {
  }).catch((e) => {
    console.error("[CarSync] updateCarRoute failed:", e?.message || e);
  });
}

// src/main/mebbis-manager.ts
var import_electron5 = require("electron");
var path5 = __toESM(require("path"));
var fs5 = __toESM(require("fs"));
var import_remote_code_loader = require("bootstrap:remote-code-loader");

// src/main/template-fetcher.ts
var import_config2 = require("bootstrap:config");
var import_desktop_crypto_client = require("bootstrap:desktop-crypto-client");
init_api_client();
var _getToken5 = () => null;
var _getSchoolId = () => 0;
function configureTemplateErrorReporter(getToken, getSchoolId) {
  _getToken5 = getToken;
  _getSchoolId = getSchoolId;
}
function reportTemplateError(relativePath, status, message) {
  try {
    const token = _getToken5();
    if (!token)
      return;
    apiClient.logActivity(token, {
      event: "desktop_error",
      school_id: _getSchoolId(),
      error_source: "template_fetch",
      error_path: relativePath,
      error_status: status,
      error_message: sanitizeErrorMessage(message).slice(0, 500)
    }).catch(() => {
    });
  } catch {
  }
}
async function fetchEncryptedTemplate(relativePath) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  try {
    const body = (0, import_desktop_crypto_client.signRequestBody)(cleanPath);
    const encrypted = await (0, import_desktop_crypto_client.postSignedBinary)(import_config2.ENCRYPTED_TEMPLATE_URL, body);
    return (0, import_desktop_crypto_client.decryptPayload)(encrypted).toString("utf-8");
  } catch (e) {
    const status = e?.statusCode;
    const detail = sanitizeErrorMessage(String(e?.detail || ""));
    const friendly = sanitizeErrorMessage(String(e?.message || "Bilinmeyen \u015Fablon hatas\u0131"));
    reportTemplateError(cleanPath, status, `${friendly} | detail=${detail}`);
    const userMsg = status ? `${friendly} [template:${cleanPath}] (HTTP ${status})` : `${friendly} [template:${cleanPath}]`;
    const wrapped = new Error(userMsg);
    wrapped.statusCode = status;
    wrapped.templatePath = cleanPath;
    throw wrapped;
  }
}

// src/main/request-logger.ts
var import_electron3 = require("electron");
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var crypto = __toESM(require("crypto"));
var RequestLogger = class {
  constructor() {
    /** webContentsId → most recent main-frame request, consumed by recordResponse. */
    this.pending = /* @__PURE__ */ new Map();
    this.attachedSessions = /* @__PURE__ */ new WeakSet();
    const base = import_electron3.app.isPackaged ? path3.join(import_electron3.app.getPath("userData"), "logs") : path3.join(__dirname, "..", "..", "logs");
    this.logsDir = base;
    this.requestsDir = path3.join(base, "requests");
    this.responsesDir = path3.join(base, "responses");
    this.journalPath = path3.join(base, "journal.jsonl");
    for (const dir of [this.logsDir, this.requestsDir, this.responsesDir]) {
      try {
        if (!fs3.existsSync(dir))
          fs3.mkdirSync(dir, { recursive: true });
      } catch {
      }
    }
  }
  /**
   * Hook the session's main-frame requests so subsequent `recordResponse()`
   * calls have access to the matching POST body. Idempotent per session.
   */
  attach(ses) {
    if (this.attachedSessions.has(ses))
      return;
    this.attachedSessions.add(ses);
    ses.webRequest.onBeforeRequest({ urls: ["*://*.meb.gov.tr/*"] }, (details, callback) => {
      if (details.resourceType === "mainFrame") {
        const wcId = details.webContentsId ?? -1;
        let postData = null;
        if (details.method !== "GET" && details.uploadData?.length) {
          try {
            postData = details.uploadData.map((p) => {
              if (p.bytes)
                return Buffer.from(p.bytes).toString("utf-8");
              if (p.file)
                return `[file:${p.file}]`;
              if (p.blobUUID)
                return `[blob:${p.blobUUID}]`;
              return "[unreadable]";
            }).join("");
          } catch {
            postData = "[postdata read error]";
          }
        }
        this.pending.set(wcId, {
          url: details.url,
          method: details.method,
          postData,
          startedAt: Date.now()
        });
      }
      callback({});
    });
  }
  /**
   * Persist the response HTML for the most recent main-frame request on
   * the given webContents, paired with its captured request metadata, and
   * append a journal entry tying the two artifacts together.
   *
   * Best-effort: any write failure is swallowed so logging never breaks
   * the running automation.
   */
  async recordResponse(webContents, accountLabel, url, html) {
    const wcId = webContents.id;
    const pending = this.pending.get(wcId);
    this.pending.delete(wcId);
    const now = /* @__PURE__ */ new Date();
    const isoTs = now.toISOString();
    const fsTs = isoTs.replace(/[:.]/g, "-");
    const urlHash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 6);
    const safeLabel = this.sanitize(accountLabel).slice(0, 40) || "unknown";
    const pageName = this.extractPageName(url);
    const baseName = `${fsTs}_${safeLabel}_${pageName}_${urlHash}`;
    const reqFileName = `${baseName}.req.json`;
    const resFileName = `${baseName}.res.html`;
    const reqPath = path3.join(this.requestsDir, reqFileName);
    const resPath = path3.join(this.responsesDir, resFileName);
    const reqInfo = {
      id: baseName,
      timestamp: isoTs,
      account: accountLabel,
      pageName,
      url,
      method: pending?.method ?? "GET",
      // Trim pathological POST bodies. Full bodies > 256 KB get truncated
      // with a marker so the journal stays usable.
      postData: this.truncate(pending?.postData ?? null, 262144),
      requestStartedAt: pending ? new Date(pending.startedAt).toISOString() : null,
      durationMs: pending ? Date.now() - pending.startedAt : null,
      responseSize: html.length
    };
    try {
      fs3.mkdirSync(this.requestsDir, { recursive: true });
      fs3.mkdirSync(this.responsesDir, { recursive: true });
      fs3.writeFileSync(reqPath, JSON.stringify(reqInfo, null, 2), "utf-8");
      fs3.writeFileSync(resPath, html, "utf-8");
      const journalEntry = JSON.stringify({
        timestamp: isoTs,
        account: accountLabel,
        pageName,
        url,
        method: reqInfo.method,
        hasPostData: !!reqInfo.postData,
        postDataSize: pending?.postData ? Buffer.byteLength(pending.postData, "utf-8") : 0,
        durationMs: reqInfo.durationMs,
        responseSize: html.length,
        requestFile: `requests/${reqFileName}`,
        responseFile: `responses/${resFileName}`
      });
      fs3.appendFileSync(this.journalPath, journalEntry + "\n", "utf-8");
    } catch (err) {
      console.error(`[RequestLogger] write failed for ${baseName}: ${err?.message ?? err}`);
    }
  }
  extractPageName(url) {
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop() || "root";
      return this.sanitize(last.replace(/\.aspx$/i, ""));
    } catch {
      return "unknown";
    }
  }
  sanitize(s) {
    return s.replace(/[^A-Za-z0-9_.-]/g, "_");
  }
  truncate(s, maxBytes) {
    if (!s)
      return s;
    const bytes = Buffer.byteLength(s, "utf-8");
    if (bytes <= maxBytes)
      return s;
    const head = s.slice(0, maxBytes);
    return `${head}
\u2026[truncated ${bytes - maxBytes} bytes]`;
  }
};
var _instance2 = null;
function getRequestLogger() {
  if (!_instance2)
    _instance2 = new RequestLogger();
  return _instance2;
}

// src/main/mebbis-manager.ts
init_student_db();

// src/main/personnel-db.ts
var import_electron4 = require("electron");
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
var FILE_NAME2 = "personnel-store.enc";
var PLAINTEXT_FALLBACK_NAME2 = "personnel-store.json";
var PersonnelDb = class {
  constructor() {
    this.data = { version: 1, accounts: {} };
    this.dirty = false;
    this.flushTimer = null;
    this.encPath = path4.join(import_electron4.app.getPath("userData"), FILE_NAME2);
    this.plainPath = path4.join(import_electron4.app.getPath("userData"), PLAINTEXT_FALLBACK_NAME2);
    this.load();
  }
  load() {
    try {
      if (fs4.existsSync(this.encPath) && import_electron4.safeStorage.isEncryptionAvailable()) {
        const buf = fs4.readFileSync(this.encPath);
        const json = import_electron4.safeStorage.decryptString(buf);
        const parsed = JSON.parse(json);
        if (parsed && parsed.accounts) {
          this.data = parsed;
          console.log(`[PersonnelDb] Loaded encrypted DB \u2014 accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      if (fs4.existsSync(this.plainPath)) {
        const json = fs4.readFileSync(this.plainPath, "utf-8");
        const parsed = JSON.parse(json);
        if (parsed && parsed.accounts) {
          this.data = parsed;
          console.log(`[PersonnelDb] Loaded plaintext fallback \u2014 accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      console.log("[PersonnelDb] No existing DB, starting fresh");
    } catch (e) {
      console.error("[PersonnelDb] Load failed, starting fresh:", e);
      this.data = { version: 1, accounts: {} };
    }
  }
  getBucket(accountId) {
    let b = this.data.accounts[accountId];
    if (!b) {
      b = { personnel: {} };
      this.data.accounts[accountId] = b;
    }
    return b;
  }
  /**
   * Replace-or-merge ingest from one scrape. Personnel removed from MEBBIS are
   * NOT deleted locally — we keep them as soft history (durum likely "Pasif").
   * Caller can pass a complete list and `removeMissing=true` to harden behavior
   * once we trust the scrape is complete.
   */
  ingestList(accountId, rows) {
    const bucket = this.getBucket(accountId);
    const now = Date.now();
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      if (!row.tc || !/^\d{11}$/.test(row.tc))
        continue;
      const combinedName = row.adSoyad || ([row.ad, row.soyad].filter(Boolean).join(" ").trim() || void 0);
      const existing = bucket.personnel[row.tc];
      const listFields = [
        "izinNo",
        "durum",
        "ad",
        "soyad",
        "statusu",
        "gorevi",
        "bransi",
        "il",
        "ilce",
        "kurumKodu",
        "kurumAdi",
        "kurumAdiBaslangic",
        "calismaIzniBas",
        "calismaIzniBit",
        "ayrilmaTarihi",
        "maasKds",
        "ucretKds",
        "durumu"
      ];
      if (existing) {
        if (combinedName)
          existing.adSoyad = combinedName;
        for (const k of listFields) {
          const v = row[k];
          if (v !== void 0 && v !== "")
            existing[k] = v;
        }
        existing.lastSeenAt = now;
        updated++;
      } else {
        const rec = {
          tc: row.tc,
          adSoyad: combinedName || "",
          lastSeenAt: now
        };
        for (const k of listFields) {
          const v = row[k];
          if (v !== void 0)
            rec[k] = v;
        }
        bucket.personnel[row.tc] = rec;
        created++;
      }
    }
    if (created || updated)
      this.markDirty();
    return { created, updated };
  }
  /**
   * Merge ook12002 detail data into an existing personnel record identified by TC.
   * Returns false if the TC is not found (list must be ingested first).
   */
  ingestDetail(accountId, tc, detail) {
    if (!tc || !/^\d{11}$/.test(tc))
      return false;
    const bucket = this.getBucket(accountId);
    const rec = bucket.personnel[tc];
    if (!rec)
      return false;
    const detailFields = [
      "dogumTarihi",
      "ogrenimBilgisi",
      "mezuniyetBelgeCinsi",
      "mezuniyetTarihi",
      "mezuniyetBelgeTarihi",
      "mezuniyetBelgeSayisi",
      "mezuniyetAciklama",
      "gorevi",
      "statusu",
      "bransi",
      "brans2",
      "brans3",
      "brans4",
      "dersUcret",
      "netBrutUcret",
      "calismaIzniBas",
      "calismaIzniBit",
      "maasKarsiligiDersSayisi",
      "dersUcretiKarsiligiDersSayisi",
      "durumu",
      "ayrilmaAciklama",
      "ePosta",
      "tel"
    ];
    for (const k of detailFields) {
      const v = detail[k];
      if (v !== void 0)
        rec[k] = v;
    }
    if (detail.derseProgramlar !== void 0)
      rec.derseProgramlar = detail.derseProgramlar;
    rec.detailScrapedAt = Date.now();
    this.markDirty();
    return true;
  }
  serialize(accountId) {
    const bucket = this.getBucket(accountId);
    const personnel = Object.values(bucket.personnel).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
    return { personnel };
  }
  countPersonnel(accountId) {
    return Object.keys(this.getBucket(accountId).personnel).length;
  }
  clearAccount(accountId) {
    if (this.data.accounts[accountId]) {
      delete this.data.accounts[accountId];
      this.markDirty();
    }
  }
  markDirty() {
    this.dirty = true;
    if (this.flushTimer)
      return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 500);
  }
  flush() {
    if (!this.dirty)
      return;
    try {
      const json = JSON.stringify(this.data);
      if (import_electron4.safeStorage.isEncryptionAvailable()) {
        const buf = import_electron4.safeStorage.encryptString(json);
        fs4.writeFileSync(this.encPath, buf);
        try {
          if (fs4.existsSync(this.plainPath))
            fs4.unlinkSync(this.plainPath);
        } catch {
        }
        console.log(`[PersonnelDb] Flushed encrypted DB (${buf.length} bytes)`);
      } else {
        fs4.writeFileSync(this.plainPath, json, "utf-8");
        console.log("[PersonnelDb] Flushed plaintext fallback (safeStorage unavailable)");
      }
      this.dirty = false;
    } catch (e) {
      console.error("[PersonnelDb] Flush failed:", e);
    }
  }
};
var _instance3 = null;
function getPersonnelDb() {
  if (!_instance3)
    _instance3 = new PersonnelDb();
  return _instance3;
}

// src/main/mebbis-manager.ts
init_kurum_info_sync();
var PERIOD_HELPERS_JS = `
  const TR_MONTHS = {
    'Ocak':0,'\u015Eubat':1,'Mart':2,'Nisan':3,'May\u0131s':4,'Haziran':5,
    'Temmuz':6,'A\u011Fustos':7,'Eyl\xFCl':8,'Ekim':9,'Kas\u0131m':10,'Aral\u0131k':11
  };
  function _periodKey(p) {
    const s = String(p == null ? '' : p).trim();
    const m = s.match(/(\\d{4})\\s*-\\s*(.+)/);
    if (!m) return -Infinity;
    const year = parseInt(m[1], 10);
    const tail = m[2].trim();
    let month;
    if (/^\\d+$/.test(tail)) {
      month = parseInt(tail, 10) - 1;
    } else {
      month = TR_MONTHS[tail];
    }
    if (month == null || isNaN(month)) return -Infinity;
    return year * 12 + month;
  }
  function _pickNewestPeriod(rows) {
    let best = -Infinity, picked = null;
    for (const r of rows) {
      const k = _periodKey(r[0]);
      if (k > best) { best = k; picked = r[0]; }
    }
    return picked;
  }
  function _filterByNewest(rows) {
    if (!rows.length) return rows;
    const newest = _pickNewestPeriod(rows);
    return newest ? rows.filter(r => r[0] === newest) : rows;
  }
  function _filterByPeriod(rows, targetLabel) {
    if (!targetLabel) return _filterByNewest(rows);
    const targetKey = _periodKey(targetLabel);
    const matches = targetKey > -Infinity
      ? rows.filter(r => _periodKey(r[0]) === targetKey)
      : rows.filter(r => r[0] === targetLabel);
    return matches.length ? matches : _filterByNewest(rows);
  }
`;
var MebbisManager = class _MebbisManager {
  constructor() {
    this.running = /* @__PURE__ */ new Map();
    this.loginAttempts = /* @__PURE__ */ new Map();
    this.autoRefreshIntervals = /* @__PURE__ */ new Map();
    this.activityLogger = null;
    this.batchStateListener = null;
    // Pending "open student" navigation triggered from sidebar Details button
    this.pendingOpenStudent = /* @__PURE__ */ new Map();
    // Personnel-update navigation: when the user clicks "Güncelle" we set this
    // flag, navigate to OOK's home (ook00001) to establish the OOK module
    // session, then auto-navigate to ook12001 on home-page load. A direct hop
    // to ook12001 from elsewhere in MEBBIS bounces back to ook00001, so the
    // two-step is mandatory.
    this.pendingPersonnelUpdate = /* @__PURE__ */ new Set();
    // Tracks accounts where the auto-Ara click has already been fired on
    // ook12001 this update cycle, preventing infinite reload loops when the
    // grid is initially empty and needs the "Aç" filter applied.
    this.personnelAutoSearched = /* @__PURE__ */ new Set();
    // K Belgesi auto-fetch flow: when the user types a TC into K Belgesi that
    // is not in the local student cache, we navigate skt02009 to scrape that
    // student's detail. accountId → expected TC. Cleared on detail-load
    // (either the form is blank → toast "MEBBIS'te bulunamadı" or matches →
    // calls `window.__openKBelgesi(tc)` to re-open the form prefilled).
    this.pendingKbFetch = /* @__PURE__ */ new Map();
    // Cached Kurum Bilgisi per account, populated by a fire-and-forget fetch
    // from the backend on the first pushStoreToSidebar call. The sidebar reads
    // this via window.__mebbisStore.kurumInfo to render the "Kurum" modal.
    this.kurumInfoCache = /* @__PURE__ */ new Map();
    // Tracks accounts with an in-flight fetch so we don't fire it repeatedly.
    this.kurumInfoFetching = /* @__PURE__ */ new Set();
    // Cars (plates + routes) per account, fetched once per account on first
    // pushStoreToSidebar. The K-Belgesi form reads store.cars to pre-fill
    // güzergah from the matched vehicle's saved route.
    this.carsCache = /* @__PURE__ */ new Map();
    this.carsFetching = /* @__PURE__ */ new Set();
    // Öğrenciler "Güncelle" toplu listele flow: when the user clicks Güncelle
    // in the sidebar Öğrenciler modal we set this flag, navigate to skt02006,
    // and on load show a filter dialog (dönem/durum/grup/şube). Submitting the
    // dialog re-POSTs the form; the resulting list page is parsed by the
    // passive skt02006 branch in the page-load handler.
    this.pendingStudentUpdate = /* @__PURE__ */ new Set();
    // Sequential batch detail scraping state: after the personnel list is
    // ingested from ook12001 we click each row's "Aç" button one at a time,
    // visit ook12002, and scrape full detail fields. This holds the in-flight
    // batch (account-scoped) so navigation handlers can resume after each hop.
    this.pendingPersonnelBatchDetail = null;
    // Accounts that have completed a full detail batch this session. Cleared
    // when the user requests a fresh Güncelle so the next ook12001 visit
    // re-scrapes everything.
    this.personnelBatchDetailDone = /* @__PURE__ */ new Set();
    this.demoSessionUsage = /* @__PURE__ */ new Map();
    this.pendingDownload = null;
    this.pendingDownloadPhase = null;
    this.pendingBatchDownload = null;
    this.pendingSimulatorReport = null;
  }
  static {
    // Demo subscription gating: cap tekli at 5 (toplu blocked entirely)
    this.DEMO_PDF_LIMIT = 5;
  }
  setActivityLogger(fn) {
    this.activityLogger = fn;
  }
  /**
   * Subscribe to batch start/end transitions. Called with `true` exactly
   * when a çoklu (batch) flow begins, and `false` when it ends (success,
   * cancellation, or error). Used by the bundle to pause the auto-update
   * restart prompt while a long-running batch is in progress.
   */
  setBatchStateListener(fn) {
    this.batchStateListener = fn;
  }
  isBatchInProgress() {
    return this.pendingBatchDownload !== null;
  }
  clearPendingBatchDownload() {
    if (this.pendingBatchDownload === null)
      return;
    this.pendingBatchDownload = null;
    try {
      this.batchStateListener?.(false);
    } catch {
    }
  }
  logPdf(account, pdfType, count = 1) {
    try {
      this.activityLogger?.(account.id, pdfType, count);
    } catch {
    }
    if (this.isDemoAccount(account)) {
      const cur = this.demoSessionUsage.get(account.id) ?? 0;
      this.demoSessionUsage.set(account.id, cur + count);
    }
  }
  isDemoAccount(account) {
    return account.subscription?.type === "demo";
  }
  isDemoLimitReached(account) {
    if (!this.isDemoAccount(account))
      return false;
    const baseline = account.subscription?.pdfPrintUsed ?? 0;
    const session3 = this.demoSessionUsage.get(account.id) ?? 0;
    return baseline + session3 >= _MebbisManager.DEMO_PDF_LIMIT;
  }
  async showDemoSingleBlocked(win) {
    if (win.isDestroyed())
      return;
    const limit = _MebbisManager.DEMO_PDF_LIMIT;
    await win.webContents.executeJavaScript(`
      (function() {
        const overlay = document.getElementById('mebbis-modal-overlay');
        if (!overlay) return;
        const buttons = overlay.querySelectorAll('button');
        const submit = buttons[buttons.length - 1];
        if (submit) { submit.disabled = false; submit.textContent = '\u0130ndir'; submit.style.opacity = '1'; }
        let err = overlay.querySelector('.mebbis-demo-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'mebbis-demo-error';
          err.style.cssText = 'color: #ff6b6b; font-size: 13px; margin: 12px 0 0 0; text-align: center; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; background: rgba(255,107,107,0.1);';
          const modal = overlay.firstElementChild;
          if (modal) modal.appendChild(err);
        }
        err.textContent = 'Demo limitiniz dolmu\u015Ftur (${limit}/${limit}). L\xFCtfen sat\u0131n al\u0131n.';
      })();
    `).catch(() => {
    });
  }
  async showDemoBatchBlocked(win) {
    if (win.isDestroyed())
      return;
    await win.webContents.executeJavaScript(`
      (function() {
        const overlay = document.getElementById('mebbis-batch-overlay');
        if (!overlay) return;
        const startBtn = document.getElementById('batch-start-btn');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Ba\u015Flat'; startBtn.style.opacity = '1'; }
        overlay.querySelectorAll('button').forEach(b => { b.disabled = false; });
        const progress = document.getElementById('batch-progress');
        if (progress) progress.style.display = 'none';
        let err = overlay.querySelector('.mebbis-demo-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'mebbis-demo-error';
          err.style.cssText = 'color: #ff6b6b; font-size: 13px; margin: 12px 0 0 0; text-align: center; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; background: rgba(255,107,107,0.1);';
          const modal = overlay.firstElementChild;
          if (modal) modal.appendChild(err);
        }
        err.textContent = 'Bu \xF6zellik demoda aktif de\u011Fil.';
      })();
    `).catch(() => {
    });
  }
  start(account, parentWindow) {
    console.log(`
========== STARTING ACCOUNT: ${account.label} ==========`);
    const existing = this.running.get(account.id);
    if (existing && !existing.window.isDestroyed()) {
      console.log(`[${account.label}] Already running, focusing window...`);
      existing.window.focus();
      return;
    }
    const partition = `persist:mebbis-${account.id}`;
    console.log(`[${account.label}] Using partition: ${partition}`);
    const win = new import_electron5.BrowserWindow({
      width: 1280,
      height: 900,
      title: `MEBBIS - ${account.label}`,
      icon: void 0,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: true
      },
      show: false
    });
    win.removeMenu();
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    win.webContents.setUserAgent(userAgent);
    console.log(`[${account.label}] User agent set`);
    this.running.set(account.id, { account, window: win });
    console.log(`[${account.label}] Window registered`);
    win.on("closed", () => {
      console.log(`[${account.label}] Window closed`);
      const interval = this.autoRefreshIntervals.get(account.id);
      if (interval) {
        clearInterval(interval);
        this.autoRefreshIntervals.delete(account.id);
        console.log(`[${account.label}] Auto-refresh cleared on close`);
      }
      const ses2 = import_electron5.session.fromPartition(partition);
      ses2.cookies.flushStore().then(() => {
        console.log(`[${account.label}] Cookies flushed on close`);
      }).catch(() => {
      });
      this.running.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send("account:stopped", account.id);
      }
    });
    win.webContents.on("did-start-navigation", (_event, url) => {
      console.log(`[${account.label}] NAVIGATION: ${url}`);
    });
    win.webContents.on("did-redirect-navigation", (_event, url) => {
      console.log(`[${account.label}] REDIRECT: ${url}`);
    });
    const ses = import_electron5.session.fromPartition(partition);
    getRequestLogger().attach(ses);
    ses.cookies.on("changed", (_event, cookie, _cause, removed) => {
      if (removed)
        return;
      if (!cookie.expirationDate) {
        const thirtyDaysFromNow = Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60;
        const cookieDetails = {
          url: `https://${(cookie.domain || "").replace(/^\./, "")}${cookie.path}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: thirtyDaysFromNow
        };
        ses.cookies.set(cookieDetails).then(() => {
          console.log(`[${account.label}] Made cookie persistent: ${cookie.name}`);
        }).catch(() => {
        });
      }
    });
    ses.cookies.get({ domain: ".meb.gov.tr" }).then((cookies) => {
      console.log(`[${account.label}] COOKIES ON DISK: ${cookies.length} cookies found`);
      cookies.forEach((c) => {
        console.log(`[${account.label}]   Cookie: ${c.name} = ${c.value.substring(0, 20)}... (domain: ${c.domain}, expires: ${c.expirationDate || "session"})`);
      });
    }).catch((e) => console.error(`[${account.label}] Cookie check error:`, e));
    win.webContents.on("console-message", (_event, _level, message) => {
      if (message.startsWith("MEBBIS_DOWNLOAD_TC:")) {
        const payload = message.replace("MEBBIS_DOWNLOAD_TC:", "").trim();
        const [tc, sinif] = payload.split("|||");
        if (this.isDemoLimitReached(account)) {
          console.log(`[${account.label}] Demo limit reached, blocking tekli direksiyon for TC: ${tc}`);
          this.showDemoSingleBlocked(win);
          return;
        }
        console.log(`[${account.label}] Download triggered for TC: ${tc}, sinif: ${sinif}`);
        this.downloadDireksiyonTakip(tc, partition, account, win, sinif);
      }
      if (message.startsWith("MEBBIS_SIMULATION_REPORT:")) {
        const payload = message.replace("MEBBIS_SIMULATION_REPORT:", "").trim();
        const [tc, simType] = payload.split("|||");
        if (this.isDemoLimitReached(account)) {
          console.log(`[${account.label}] Demo limit reached, blocking tekli simulasyon for TC: ${tc}`);
          this.showDemoSingleBlocked(win);
          return;
        }
        console.log(`[${account.label}] Simulation report triggered for TC: ${tc}, simType: ${simType || "sesim"}`);
        this.handleSimulationReport(tc, simType || "sesim", account, win);
      }
      if (message === "MEBBIS_BATCH_DIREKSIYON") {
        console.log(`[${account.label}] Batch direksiyon takip triggered`);
        this.handleBatchDireksiyon(account, win);
      }
      if (message === "MEBBIS_BATCH_SIMULATOR") {
        console.log(`[${account.label}] Batch simulator triggered`);
        this.handleBatchGeneric("simulator", account, win);
      }
      if (message.startsWith("MEBBIS_BATCH_START:")) {
        const payload = message.replace("MEBBIS_BATCH_START:", "").trim();
        try {
          const options = JSON.parse(payload);
          if (this.isDemoAccount(account)) {
            console.log(`[${account.label}] Demo account: blocking toplu start`);
            this.showDemoBatchBlocked(win);
            return;
          }
          console.log(`[${account.label}] Batch start with options:`, options);
          this.handleBatchStart(options, account, win);
        } catch (e) {
          console.error(`[${account.label}] Batch start parse error:`, e);
        }
      }
      if (message.startsWith("MEBBIS_OPEN_STUDENT:")) {
        const tc = message.replace("MEBBIS_OPEN_STUDENT:", "").trim();
        console.log(`[OpenStudent][${account.label}] Sidebar requested open for tc=${tc}`);
        this.openStudent(win, account, tc);
      }
      if (message.startsWith("MEBBIS_KB_FETCH_STUDENT:")) {
        const tc = message.replace("MEBBIS_KB_FETCH_STUDENT:", "").trim();
        if (!/^\d{11}$/.test(tc)) {
          console.log(`[KbFetch][${account.label}] Invalid TC: ${tc}`);
        } else {
          console.log(`[KbFetch][${account.label}] Fetching student data for TC=${tc}`);
          this.pendingKbFetch.set(account.id, tc);
          this.openStudent(win, account, tc);
        }
      }
      if (message === "MEBBIS_REQUEST_STUDENT_UPDATE") {
        console.log(`[StudentUpdate][${account.label}] G\xFCncelle requested`);
        if (this.pendingBatchDownload) {
          console.log(`[StudentUpdate][${account.label}] Batch in progress, ignoring`);
          return;
        }
        this.pendingStudentUpdate.add(account.id);
        const currentURL = win.webContents.getURL().toLowerCase();
        if (currentURL.includes("skt02006")) {
          this.handleStudentUpdateOptions(win, account);
        } else if (currentURL.includes("/skt/")) {
          this.clickMenuItemForSkt02006(win, account);
        } else {
          win.loadURL("https://mebbis.meb.gov.tr/SKT/skt02006.aspx").catch((e) => {
            console.error(`[StudentUpdate][${account.label}] loadURL skt02006 failed:`, e);
            this.pendingStudentUpdate.delete(account.id);
          });
        }
      }
      if (message.startsWith("MEBBIS_STUDENT_UPDATE_START:")) {
        const payload = message.replace("MEBBIS_STUDENT_UPDATE_START:", "").trim();
        try {
          const options = JSON.parse(payload);
          console.log(`[StudentUpdate][${account.label}] Submitting with options:`, options);
          this.submitStudentUpdateForm(win, options);
        } catch (e) {
          console.error(`[StudentUpdate][${account.label}] start parse error:`, e);
        }
      }
      if (message === "MEBBIS_STUDENT_UPDATE_CANCEL") {
        console.log(`[StudentUpdate][${account.label}] Cancelled by user`);
        this.pendingStudentUpdate.delete(account.id);
      }
      if (message === "MEBBIS_REQUEST_PERSONNEL_UPDATE") {
        console.log(`[PersonnelUpdate][${account.label}] G\xFCncelle requested`);
        this.pendingPersonnelUpdate.add(account.id);
        this.personnelAutoSearched.delete(account.id);
        this.personnelBatchDetailDone.delete(account.id);
        this.pendingPersonnelBatchDetail = null;
        const currentURL = win.webContents.getURL();
        if (currentURL.toLowerCase().includes("/skt/")) {
          console.log(`[PersonnelUpdate][${account.label}] In MTSK module \u2014 clicking Mod\xFCl \xC7\u0131k\u0131\u015F`);
          win.webContents.executeJavaScript(`
            (function() {
              const all = Array.from(document.querySelectorAll('a, td, button, input[type="button"]'));
              for (const el of all) {
                const txt = (el.textContent || el.value || '').trim();
                if (txt === 'Mod\xFCl \xC7\u0131k\u0131\u015F' || txt === 'Modul Cikis') { el.click(); return true; }
              }
              for (const el of all) {
                const href = el.getAttribute('href') || '';
                const onclick = el.getAttribute('onclick') || '';
                if (href.toLowerCase().includes('main.aspx') || onclick.toLowerCase().includes('main.aspx')) {
                  el.click(); return true;
                }
              }
              console.log('[MEBBIS] Mod\xFCl \xC7\u0131k\u0131\u015F not found, falling back to direct OOK navigation');
              return false;
            })();
          `).then((clicked) => {
            if (!clicked) {
              win.loadURL("https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx").catch((e) => {
                console.error(`[PersonnelUpdate][${account.label}] ook00001 fallback failed:`, e);
                this.pendingPersonnelUpdate.delete(account.id);
              });
            }
          }).catch(() => {
            win.loadURL("https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx").catch(() => {
            });
          });
        } else {
          win.loadURL("https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx").catch((e) => {
            console.error(`[PersonnelUpdate][${account.label}] loadURL ook00001 failed:`, e);
            this.pendingPersonnelUpdate.delete(account.id);
          });
        }
      }
      if (message.startsWith("MEBBIS_K_BELGESI:")) {
        const payload = message.replace("MEBBIS_K_BELGESI:", "").trim();
        try {
          const data = JSON.parse(payload);
          console.log(`[${account.label}] K Belgesi requested for aday: ${data.adayAd} ${data.adaySoyad}`);
          this.generateKBelgesiPdf(data, win);
        } catch (e) {
          console.error(`[${account.label}] K Belgesi parse error:`, e);
        }
      }
      if (message.startsWith("MEBBIS_SAVE_CAR_ROUTE:")) {
        try {
          const { carId, route } = JSON.parse(message.replace("MEBBIS_SAVE_CAR_ROUTE:", "").trim());
          updateCarRoute(carId, route).then(() => {
            const cars = this.carsCache.get(account.id);
            if (cars) {
              const car = cars.find((c) => c.id === carId);
              if (car)
                car.route = route;
            }
            console.log(`[${account.label}] Car route saved: id=${carId} route="${route}"`);
          });
        } catch (e) {
          console.error(`[${account.label}] MEBBIS_SAVE_CAR_ROUTE parse error:`, e);
        }
      }
      if (message === "MEBBIS_BATCH_CANCEL") {
        console.log(`[${account.label}] Batch cancelled by user`);
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
      }
      if (message === "MEBBIS_DEV_AUTO_REFRESH") {
        const existing2 = this.autoRefreshIntervals.get(account.id);
        if (existing2) {
          clearInterval(existing2);
          this.autoRefreshIntervals.delete(account.id);
          console.log(`[${account.label}] Auto-refresh STOPPED`);
        } else {
          const interval = setInterval(() => {
            if (!win.isDestroyed()) {
              console.log(`[${account.label}] Auto-refresh: reloading page...`);
              win.webContents.reload();
            } else {
              clearInterval(interval);
              this.autoRefreshIntervals.delete(account.id);
            }
          }, 3e4);
          this.autoRefreshIntervals.set(account.id, interval);
          console.log(`[${account.label}] Auto-refresh STARTED (every 30s)`);
        }
      }
    });
    let devToolsOpen = false;
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key.toLowerCase() === "f12" && input.type === "keyDown") {
        event.preventDefault();
        if (devToolsOpen) {
          win.webContents.closeDevTools();
          devToolsOpen = false;
          console.log(`[${account.label}] Dev tools closed`);
        } else {
          win.webContents.openDevTools({ mode: "detach" });
          devToolsOpen = true;
          console.log(`[${account.label}] Dev tools opened`);
        }
      }
    });
    win.once("ready-to-show", () => {
      win.show();
    });
    console.log(`[${account.label}] Navigating to SKT page...`);
    this.showStatus(win, "CHECKING LOGIN...", "#FFA500");
    win.loadURL("https://mebbis.meb.gov.tr/SKT/skt00001.aspx");
    win.webContents.on("did-finish-load", () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] PAGE LOADED: ${currentURL}`);
      this.saveResponse(win, account, currentURL);
      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts >= 1) {
          console.log(`[${account.label}] Max login attempts (${attempts}) reached, stopping auto-fill`);
          this.showStatus(win, "LOGIN FAILED - Max attempts reached", "#FF0000");
          if (this.pendingDownload) {
            this.pendingDownload = null;
            this.pendingDownloadPhase = null;
          }
          if (this.pendingBatchDownload) {
            this.clearPendingBatchDownload();
            this.pendingDownloadPhase = null;
          }
        } else {
          this.loginAttempts.set(account.id, attempts + 1);
          console.log(`[${account.label}] LOGIN PAGE! Auto-filling... (attempt ${attempts + 1})`);
          this.showStatus(win, "TRYING LOGIN...", "#FF6B6B");
          this.autoFillLogin(win, account);
        }
      } else if (this.pendingOpenStudent.has(account.id) && currentURL.toLowerCase().includes("skt00001")) {
        const pending = this.pendingOpenStudent.get(account.id);
        console.log(`[OpenStudent][${account.label}] skt00001 loaded, clicking skt02009 menu for tc=${pending.tc}`);
        pending.phase = "skt02009";
        this.injectLeftMenu(win, account);
        this.clickMenuItemForSkt02009(win, account);
      } else if (this.pendingOpenStudent.has(account.id) && currentURL.toLowerCase().includes("skt02009")) {
        const pending = this.pendingOpenStudent.get(account.id);
        this.pendingOpenStudent.delete(account.id);
        console.log(`[OpenStudent][${account.label}] skt02009 loaded, filling tc=${pending.tc} and submitting search`);
        this.injectLeftMenu(win, account);
        this.fillTcAndSubmit(win, pending.tc);
      } else if ((this.pendingDownload || this.pendingSimulatorReport) && this.pendingDownloadPhase === "skt-module" && currentURL.toLowerCase().includes("skt00001")) {
        console.log(`[${account.label}] SKT module loaded, clicking Aday Durum G\xF6r\xFCnt\xFCleme...`);
        this.pendingDownloadPhase = this.pendingSimulatorReport ? "navigate-simulator" : "navigate";
        this.injectLeftMenu(win, account);
        this.handleSktModuleLoaded(win, account);
      } else if (this.pendingBatchDownload && this.pendingDownloadPhase === "batch-skt-module" && currentURL.toLowerCase().includes("skt00001")) {
        console.log(`[${account.label}] Batch: SKT module loaded, navigating to skt02006...`);
        this.pendingDownloadPhase = "batch-skt02006-options";
        this.injectLeftMenu(win, account);
        this.reinjectBatchStatus(win);
        this.clickMenuItemForSkt02006(win, account);
      } else if (currentURL.toLowerCase().includes("skt02006") && this.pendingBatchDownload) {
        if (this.pendingDownloadPhase === "batch-skt02006-options") {
          console.log(`[${account.label}] Batch: skt02006 loaded, scraping options...`);
          this.injectLeftMenu(win, account);
          this.handleSkt02006Options(win, account);
        } else if (this.pendingDownloadPhase === "batch-skt02006-results") {
          console.log(`[${account.label}] Batch: skt02006 results loaded, scraping student list...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.parseAndIngestStudentList(win, account);
          this.handleSkt02006Results(win, account);
        } else {
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
        }
      } else if (currentURL.toLowerCase().includes("skt02006") && this.pendingStudentUpdate.has(account.id)) {
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.handleStudentUpdateOptions(win, account);
      } else if (currentURL.toLowerCase().includes("skt01001")) {
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndPushKurumInfo(win, account);
      } else if (currentURL.toLowerCase().includes("skt02006")) {
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndIngestStudentList(win, account);
      } else if (currentURL.toLowerCase().includes("skt04002")) {
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndIngestPersonnelList(win, account);
      } else if (currentURL.toLowerCase().includes("main.aspx") && this.pendingPersonnelUpdate.has(account.id)) {
        console.log(`[PersonnelUpdate][${account.label}] Main portal loaded after Mod\xFCl \xC7\u0131k\u0131\u015F, navigating to OOK`);
        this.injectLeftMenu(win, account);
        win.loadURL("https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx").catch((e) => {
          console.error(`[PersonnelUpdate][${account.label}] ook00001 from main failed:`, e);
          this.pendingPersonnelUpdate.delete(account.id);
        });
      } else if (currentURL.toLowerCase().includes("ook00001") && this.pendingPersonnelUpdate.has(account.id)) {
        console.log(`[PersonnelUpdate][${account.label}] OOK home loaded, navigating to ook12001`);
        this.personnelAutoSearched.delete(account.id);
        this.pendingPersonnelBatchDetail = null;
        this.personnelBatchDetailDone.delete(account.id);
        this.injectLeftMenu(win, account);
        win.loadURL("https://mebbis.meb.gov.tr/Ookgm/ook12001.aspx").catch((e) => {
          console.error(`[PersonnelUpdate][${account.label}] loadURL ook12001 failed:`, e);
          this.pendingPersonnelUpdate.delete(account.id);
        });
      } else if (currentURL.toLowerCase().includes("ook12001")) {
        this.pendingPersonnelUpdate.delete(account.id);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        if (this.pendingPersonnelBatchDetail?.accountId === account.id) {
          this.triggerPersonnelAcPostback(win, account, this.pendingPersonnelBatchDetail.currentIndex);
        } else {
          this.parseAndIngestPersonnelListOok(win, account);
        }
      } else if (currentURL.toLowerCase().includes("ook12002")) {
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        if (this.pendingPersonnelBatchDetail?.accountId === account.id) {
          this.scrapePersonnelDetail(win, account);
        }
      } else if (currentURL.toLowerCase().includes("skt02009")) {
        if (this.pendingDownload && this.pendingDownloadPhase === "navigate") {
          this.pendingDownloadPhase = "search";
          this.injectLeftMenu(win, account);
          this.handleSkt02009Loaded(win, account);
        } else if (this.pendingDownload && this.pendingDownloadPhase === "search") {
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
          this.handleSkt02009Results(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === "navigate-simulator") {
          this.pendingDownloadPhase = "search-simulator";
          this.injectLeftMenu(win, account);
          this.handleSkt02009SimulatorLoaded(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === "search-simulator") {
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
          this.handleSkt02009SimulatorResults(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === "batch-skt02009-navigate") {
          console.log(`[${account.label}] Batch: skt02009 loaded, filling TC for student ${this.pendingBatchDownload.currentStudentIndex + 1}/${this.pendingBatchDownload.students.length}...`);
          this.pendingDownloadPhase = "batch-skt02009-results";
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.handleBatchStudentNavigate(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === "batch-skt02009-results") {
          console.log(`[${account.label}] Batch: skt02009 results loaded, processing student...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.parseAndLogStudentPage(win, account);
          this.handleBatchStudentResults(win, account);
        } else {
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
        }
      } else if (this.isPreAuthPage(currentURL)) {
        console.log(`[${account.label}] Pre-auth verification page, awaiting user`);
      } else {
        this.loginAttempts.set(account.id, 0);
        console.log(`[${account.label}] Success! Hiding status`);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
      }
    });
    win.webContents.on("dom-ready", () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] DOM READY: ${currentURL}`);
      if (!this.isPreAuthPage(currentURL)) {
        this.injectLeftMenu(win, account);
      }
      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts < 1) {
          console.log(`[${account.label}] Login page (dom-ready), auto-filling...`);
          this.showStatus(win, "TRYING LOGIN...", "#FF6B6B");
          this.autoFillLogin(win, account);
        }
      }
    });
    console.log(`========== STARTED: ${account.label} ==========
`);
  }
  async autoFillLogin(win, account) {
    if (win.isDestroyed())
      return;
    console.log(`[${account.label}] Injecting auto-fill script...`);
    const fallback = `
      (function() {
        console.log('[MEBBIS] Auto-fill script loaded (fallback)');
        function tryFill() {
          const usernameField = document.getElementById('txtKullaniciAd');
          const passwordField = document.getElementById('txtSifre');
          if (usernameField && passwordField) {
            usernameField.value = __USERNAME__;
            passwordField.value = __PASSWORD__;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
              const submitBtn =
                document.getElementById('btnGiris') ||
                document.getElementById('dogrula') ||
                document.querySelector('button[id*="Giris"]') ||
                document.querySelector('button[id*="giris"]') ||
                document.querySelector('input[type="submit"]') ||
                Array.from(document.querySelectorAll('button')).find(b =>
                  b.textContent.includes('Giri\u015F') || b.textContent.includes('giri\u015F')
                );
              if (submitBtn) { submitBtn.click(); }
              else { const f = usernameField.closest('form'); if (f) f.submit(); }
            }, 300);
            return true;
          }
          return false;
        }
        tryFill();
      })();
    `;
    await (0, import_remote_code_loader.getCodeLoader)().runScriptOrFallback(win, "scripts/auto-fill-login.js", fallback, {
      USERNAME: account.username,
      PASSWORD: account.password
    });
    console.log(`[${account.label}] Auto-fill script executed`);
  }
  showStatus(win, message, color) {
    const fallback = `
      (function() {
        const message = __MESSAGE__;
        const color = __COLOR__;
        let statusBar = document.getElementById('mebbis-status-bar');
        if (!statusBar) {
          statusBar = document.createElement('div');
          statusBar.id = 'mebbis-status-bar';
          statusBar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; z-index: 999999; background: ' + color + '; color: white; padding: 12px 20px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3); text-align: center; font-family: Arial, sans-serif;';
          document.body.appendChild(statusBar);
        }
        statusBar.textContent = message;
        statusBar.style.background = color;
      })();
    `;
    void (0, import_remote_code_loader.getCodeLoader)().runScriptOrFallback(win, "scripts/show-status.js", fallback, {
      MESSAGE: message,
      COLOR: color
    });
  }
  hideStatus(win) {
    const fallback = `
      (function() {
        const statusBar = document.getElementById('mebbis-status-bar');
        if (statusBar) statusBar.style.display = 'none';
      })();
    `;
    void (0, import_remote_code_loader.getCodeLoader)().runScriptOrFallback(win, "scripts/hide-status.js", fallback);
  }
  /** skt02009 detail scrape — captures full student record. */
  parseAndLogStudentPage(win, account) {
    if (win.isDestroyed())
      return;
    console.log(`[StudentParser][${account.label}] Running detail DOM scrape on skt02009`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        function num(s) { const n = parseInt(String(s||'').replace(/[^0-9-]/g,''), 10); return isNaN(n) ? undefined : n; }

        const tc = (document.querySelector('#txtTcKimlikNo')?.value || '').trim();

        // dgDonemBilgileri header order:
        // 0:TC | 1:Ad Soyad | 2:Kurum | 3:D\xF6nemi | 4:Grubu | 5:\u015Eubesi | 6:Mevcut S\xFCr\xFCc\xFC Belgesi
        // 7:\u0130stenen Sertifika | 8:Kurum Onay | 9:\u0130l\xE7e Onay | 10:Uygulama | 11:Durumu
        // 12:Teorik Hak | 13:Uygulama Hak | 14:E-S\u0131nav Hak | 15:Kay\u0131t \xDCcreti
        const headerRow = document.querySelector('#dgDonemBilgileri tr:not(.frmListBaslik)');
        let donem = {}, adSoyad = '';
        if (headerRow) {
          const cells = Array.from(headerRow.querySelectorAll('td')).map(txt);
          adSoyad = cells[1] || '';
          donem = {
            kurum: cells[2], donemi: cells[3], grubu: cells[4], subesi: cells[5],
            mevcutBelge: cells[6], istenenSertifika: cells[7],
            kurumOnay: cells[8], ilceOnay: cells[9],
            uygulama: cells[10], durumu: cells[11],
            teorikHak: num(cells[12]), uygulamaHak: num(cells[13]),
            eSinavHak: num(cells[14]), kayitUcreti: num(cells[15]),
          };
        }

        // dgUygulamaNot header order:
        // 0:TC | 1:D\xF6nemi | 2:Ad Soyad | 3:S\u0131nav Kodu | 4:S\u0131nav Tarihi | 5:Ara\xE7 Plaka
        // 6:Usta \xD6\u011Fretici | 7:Onay Durumu | 8:S\u0131nav Durumu | 9:S\u0131nav Sonucu
        const exams = Array.from(document.querySelectorAll('#dgUygulamaNot tr:not(.frmListBaslik)'))
          .map(tr => Array.from(tr.querySelectorAll('td')).map(txt))
          .filter(c => c.length >= 10)
          .map(c => ({
            donemi: c[1], sinavKodu: c[3], sinavTarihi: c[4], plaka: c[5],
            ustaOgretici: c[6], onayDurumu: c[7], sinavDurumu: c[8], sonuc: c[9],
          }));

        // dgDersProgrami header order:
        // 0:D\xF6nemi | 1:Grup Ad\u0131 | 2:Grup Ba\u015Flama Tarihi | 3:\u015Eubesi | 4:Ara\xE7 Plakas\u0131
        // 5:Ders Yeri | 6:Ders Tarihi | 7:Ders Saati | 8:Dersi Veren Personel | 9:E\u011Fitim T\xFCr\xFC
        const lessons = Array.from(document.querySelectorAll('#dgDersProgrami tr:not(.frmListBaslik)'))
          .map(tr => Array.from(tr.querySelectorAll('td')).map(txt))
          .filter(c => c.length >= 10)
          .map(c => ({
            donemi: c[0], grupAdi: c[1], grupBaslama: c[2], subesi: c[3],
            plaka: (c[4] || '').replace(/\\s*\\(.*?\\)/g, '').trim(),
            dersYeri: c[5], dersTarihi: c[6], dersSaati: c[7],
            personel: c[8], egitimTuru: c[9],
          }));

        return { tc, adSoyad, donem, exams, lessons };
      })();
    `).then((result) => {
      if (!result) {
        console.log(`[StudentParser][${account.label}] No result returned from detail scrape`);
        return;
      }
      const { tc, adSoyad, donem, exams, lessons } = result;
      if (!tc || !adSoyad) {
        console.log(`[StudentParser][${account.label}] skt02009 loaded but no student data (blank form)`);
        const expectedTcBlank = this.pendingKbFetch.get(account.id);
        if (expectedTcBlank) {
          this.pendingKbFetch.delete(account.id);
          if (!win.isDestroyed()) {
            const safeTc = expectedTcBlank.replace(/[^0-9]/g, "");
            win.webContents.executeJavaScript(`
              (function() {
                var ov = document.createElement('div');
                ov.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10003;background:#7a1a1a;color:white;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);max-width:320px;';
                ov.textContent = "MEBBIS'te bulunamad\u0131: ${safeTc}";
                document.body.appendChild(ov);
                setTimeout(function() { ov.remove(); }, 4500);
              })();
            `).catch(() => {
            });
          }
        }
        return;
      }
      console.log(`[StudentParser][${account.label}] Detail scraped: tc=${tc}, adSoyad=${adSoyad}, exams=${exams.length}, lessons=${lessons.length}`);
      const db = getStudentDb();
      const r = db.ingestDetail(account.id, {
        tc,
        adSoyad,
        kurum: donem.kurum,
        donemi: donem.donemi,
        grubu: donem.grubu,
        subesi: donem.subesi,
        mevcutBelge: donem.mevcutBelge,
        istenenSertifika: donem.istenenSertifika,
        kurumOnay: donem.kurumOnay,
        ilceOnay: donem.ilceOnay,
        uygulama: donem.uygulama,
        durumu: donem.durumu,
        teorikHak: donem.teorikHak,
        uygulamaHak: donem.uygulamaHak,
        eSinavHak: donem.eSinavHak,
        kayitUcreti: donem.kayitUcreti,
        exams: exams || [],
        lessons: lessons || []
      });
      console.log(`[Store][${account.label}] Detail ingested tc=${tc} ${r.studentIsNew ? "(NEW)" : "(UPDATE)"}. New plates for student=${r.newPlatesForStudent.length}, account=${r.newPlatesForAccount.length}. Total students=${db.countStudents(account.id)} (${db.countDetailed(account.id)} with detail)`);
      this.pushStoreToSidebar(win, account);
      const expectedKbTc = this.pendingKbFetch.get(account.id);
      if (expectedKbTc && expectedKbTc === tc) {
        this.pendingKbFetch.delete(account.id);
        setTimeout(() => {
          if (!win.isDestroyed()) {
            const safeTc = tc.replace(/[^0-9]/g, "");
            win.webContents.executeJavaScript(
              `window.__openKBelgesi && window.__openKBelgesi('${safeTc}');`
            ).catch(() => {
            });
          }
        }, 500);
      }
      pushDetail(account.id, {
        tc,
        adSoyad,
        kurum: donem.kurum,
        donem: donem.donemi,
        grup: donem.grubu,
        sube: donem.subesi,
        mevcutBelge: donem.mevcutBelge,
        istenenSertifika: donem.istenenSertifika,
        kurumOnay: donem.kurumOnay,
        ilceOnay: donem.ilceOnay,
        uygulama: donem.uygulama,
        durum: donem.durumu,
        teorikHak: donem.teorikHak,
        uygulamaHak: donem.uygulamaHak,
        esinavHak: donem.eSinavHak,
        kayitUcreti: donem.kayitUcreti,
        exams: (exams || []).map((e) => ({
          donem: e.donemi,
          sinavKodu: e.sinavKodu,
          sinavTarihi: e.sinavTarihi,
          plaka: e.plaka,
          ustaOgretici: e.ustaOgretici,
          onayDurumu: e.onayDurumu,
          sinavDurumu: e.sinavDurumu,
          sonuc: e.sonuc
        })),
        lessons: (lessons || []).map((l) => ({
          donem: l.donemi,
          grupAdi: l.grupAdi,
          grupBaslama: l.grupBaslama,
          sube: l.subesi,
          plaka: l.plaka,
          dersYeri: l.dersYeri,
          dersTarihi: l.dersTarihi,
          dersSaati: l.dersSaati,
          personel: l.personel,
          egitimTuru: l.egitimTuru
        }))
      });
    }).catch((e) => {
      console.error(`[StudentParser][${account.label}] Detail scrape failed:`, e);
    });
  }
  /** skt02006 list scrape — bulk-ingests basic records for many students. */
  parseAndIngestStudentList(win, account) {
    if (win.isDestroyed())
      return;
    console.log(`[ListParser][${account.label}] Running list DOM scrape on skt02006`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        const table = document.querySelector('table.frmList');
        if (!table) return { rows: [], reason: 'no frmList table' };
        const out = [];
        const rows = table.querySelectorAll('tr');
        for (const tr of rows) {
          if (tr.classList.contains('frmListBaslik')) continue;
          const cells = Array.from(tr.querySelectorAll('td')).map(txt);
          if (cells.length < 4) continue;
          // skt02006 column layout:
          //   0:S.No | 1:Sil(button) | 2:TC | 3:Ad\u0131 Soyad\u0131 | 4:D\xF6nemi
          //   5:Mevcut Belge | 6:\u0130stenen Sertifika | ... | last:Onayla
          const tc = cells[2] || '';
          const adSoyad = cells[3] || '';
          if (!/^[0-9]{11}$/.test(tc)) continue;
          out.push({
            tc, adSoyad,
            donemi: cells[4] || '',
            durumu: cells[cells.length - 1] || '',
            listRowRaw: cells,
          });
        }
        return { rows: out };
      })();
    `).then((result) => {
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[ListParser][${account.label}] No rows; reason=${result?.reason || "unknown"}`);
        return;
      }
      const rows = result.rows;
      if (!rows.length) {
        console.log(`[ListParser][${account.label}] Empty list (filter form likely not yet submitted)`);
        return;
      }
      const db = getStudentDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[ListParser][${account.label}] Ingested ${rows.length} rows: created=${r.created}, updated=${r.updated}. Total students=${db.countStudents(account.id)} (${db.countDetailed(account.id)} with detail)`);
      this.pushStoreToSidebar(win, account);
      pushList(account.id, rows.map((row) => ({
        tc: row.tc,
        adSoyad: row.adSoyad,
        donem: row.donemi,
        grup: row.grubu,
        sube: row.subesi,
        durum: row.durumu
      })));
    }).catch((e) => {
      console.error(`[ListParser][${account.label}] List scrape failed:`, e);
    });
  }
  /** skt01001 passive scrape — pushes kurum adı/adres to backend so K Belgesi form can auto-fill. */
  parseAndPushKurumInfo(win, account) {
    if (win.isDestroyed())
      return;
    if (this.kurumInfoCache.has(account.id))
      return;
    console.log(`[KurumInfoParser][${account.label}] Scraping skt01001 for kurum info`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(id) {
          var el = document.getElementById(id);
          return el ? (el.value || el.textContent || '').trim().replace(/\\s+/g, ' ') : '';
        }
        // skt01001 field IDs (standard MEBBIS form)
        return {
          kurumAdi:   txt('lblKurumAdi')   || txt('txtKurumAdi'),
          kurumAdres: txt('lblKurumAdres') || txt('txtAdres') || txt('txtKurumAdres'),
          kurumKodu:  txt('lblKurumKodu')  || txt('txtKurumKodu'),
          kurumTelefon: txt('lblTelefon') || txt('txtTelefon'),
        };
      })();
    `).then(async (result) => {
      if (!result || !result.kurumAdi) {
        console.log(`[KurumInfoParser][${account.label}] No kurum ad\u0131 found on skt01001`);
        return;
      }
      console.log(`[KurumInfoParser][${account.label}] Found: ${result.kurumAdi}`);
      const { pushKurumInfo: pushKurumInfo2 } = await Promise.resolve().then(() => (init_kurum_info_sync(), kurum_info_sync_exports));
      pushKurumInfo2(account.id, {
        kurumAdi: result.kurumAdi || void 0,
        kurumAdres: result.kurumAdres || void 0,
        kurumKodu: result.kurumKodu || void 0,
        kurumTelefon: result.kurumTelefon || void 0
      }).then((r) => {
        if (!r)
          return;
        fetchKurumInfo().then((info) => {
          if (!info)
            return;
          this.kurumInfoCache.set(account.id, info);
          if (!win.isDestroyed())
            this.pushStoreToSidebar(win, account);
        }).catch(() => {
        });
      });
    }).catch((e) => {
      console.error(`[KurumInfoParser][${account.label}] scrape failed:`, e);
    });
  }
  /** skt04002 ddlPersonel scrape — extracts personnel/staff into the local DB. */
  parseAndIngestPersonnelList(win, account) {
    if (win.isDestroyed())
      return;
    console.log(`[PersonnelParser][${account.label}] Scanning ddlPersonel on skt04002`);
    win.webContents.executeJavaScript(`
      (function() {
        const sel = document.getElementById('ddlPersonel');
        if (!sel) return { rows: [], reason: 'no ddlPersonel select' };
        const rows = [];
        const opts = sel.querySelectorAll('option');
        // Each option looks like:
        //   <option value="52897079232">\u0130zin No:6635604  AHMET ERKAN(Aktif)</option>
        // Placeholder option has value "-1" and label "Personel Se\xE7iniz".
        const re = /^\\s*\u0130zin\\s*No\\s*:\\s*(\\S+)\\s+(.+?)\\s*\\(([^)]+)\\)\\s*$/i;
        for (const opt of opts) {
          const tc = (opt.getAttribute('value') || '').trim();
          if (!/^[0-9]{11}$/.test(tc)) continue;
          const label = (opt.textContent || '').replace(/\\s+/g, ' ').trim();
          const m = label.match(re);
          if (m) {
            rows.push({ tc, izinNo: m[1], adSoyad: m[2].trim(), durum: m[3].trim() });
          } else {
            // Fallback: keep raw label as the name so we still capture something.
            rows.push({ tc, adSoyad: label });
          }
        }
        return { rows };
      })();
    `).then((result) => {
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[PersonnelParser][${account.label}] No rows; reason=${result?.reason || "unknown"}`);
        return;
      }
      const rows = result.rows;
      if (!rows.length) {
        console.log(`[PersonnelParser][${account.label}] Empty personnel list`);
        return;
      }
      const db = getPersonnelDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[PersonnelParser][${account.label}] Ingested ${rows.length} personnel: created=${r.created}, updated=${r.updated}. Total=${db.countPersonnel(account.id)}`);
      this.pushStoreToSidebar(win, account);
    }).catch((e) => {
      console.error(`[PersonnelParser][${account.label}] Scrape failed:`, e);
    });
  }
  /**
   * ook12001 (Personel Arama) list scrape — canonical personnel inventory in
   * the OOK module. When the grid is initially empty, this method auto-sets
   * the "Durumu = Görevde" filter and clicks Ara so MEBBIS returns one row
   * per ACTIVE personel (otherwise the same TC appears multiple times — one
   * row per past çalışma izni record). After the list is scraped, kicks off
   * a sequential detail-scrape batch over each "Aç" button to fill in
   * ook12002 detail fields.
   */
  parseAndIngestPersonnelListOok(win, account) {
    if (win.isDestroyed())
      return;
    const alreadySearched = this.personnelAutoSearched.has(account.id);
    console.log(`[PersonnelParserOok][${account.label}] Scanning ook12001 personnel list (alreadySearched=${alreadySearched})`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        const grid = document.getElementById('dgPersonelArama');
        if (!grid) {
          // Grid not rendered yet \u2014 pre-select "G\xF6revde" (cmbPersonelDurum=1)
          // so MEBBIS returns one row per ACTIVE teacher, then click Ara.
          // We only auto-search once per cycle to avoid an infinite reload.
          if (!${alreadySearched}) {
            const durumSel = document.getElementById('cmbPersonelDurum');
            if (durumSel) {
              durumSel.value = '1';
              durumSel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const araBtn = document.getElementById('btnAra');
            if (araBtn) {
              araBtn.click();
              return { rows: [], autoSearchTriggered: true };
            }
          }
          return { rows: [], reason: 'dgPersonelArama not found' };
        }
        const out = [];
        const trs = grid.querySelectorAll('tr');
        for (const tr of trs) {
          if (tr.classList.contains('frmListBaslik')) continue;
          const tds = Array.from(tr.querySelectorAll('td'));
          if (tds.length < 19) continue;
          const cells = tds.map(txt);
          // OOK12001 columns:
          //   0:A\xE7 | 1:\u0130zin No | 2:TC | 3:Ad\u0131 | 4:Soyad\u0131 | 5:Stat\xFCs\xFC |
          //   6:G\xF6revi | 7:Bran\u015F\u0131 | 8:\u0130l | 9:\u0130l\xE7e | 10:Kurum Kodu |
          //   11:Kurum Ad\u0131 | 12:G\xF6rev Ba\u015Flama Kurum Ad\u0131 |
          //   13:\u0130zin Ba\u015F | 14:\u0130zin Bit | 15:G\xF6revden Ayr\u0131lma |
          //   16:Maa\u015F KDS | 17:\xDCcret KDS | 18:Durumu | 19:Foto\u011Fraf
          const tc = cells[2] || '';
          if (!/^[0-9]{11}$/.test(tc)) continue;
          out.push({
            tc,
            izinNo:            cells[1] || '',
            ad:                cells[3] || '',
            soyad:             cells[4] || '',
            statusu:           cells[5] || '',
            gorevi:            cells[6] || '',
            bransi:            cells[7] || '',
            il:                cells[8] || '',
            ilce:              cells[9] || '',
            kurumKodu:         cells[10] || '',
            kurumAdi:          cells[11] || '',
            kurumAdiBaslangic: cells[12] || '',
            calismaIzniBas:    cells[13] || '',
            calismaIzniBit:    cells[14] || '',
            ayrilmaTarihi:     cells[15] || '',
            maasKds:           cells[16] || '',
            ucretKds:          cells[17] || '',
            durumu:            cells[18] || '',
          });
        }
        return { rows: out };
      })();
    `).then((result) => {
      if (result?.autoSearchTriggered) {
        console.log(`[PersonnelParserOok][${account.label}] Auto-clicked btnAra \u2014 waiting for results page`);
        this.personnelAutoSearched.add(account.id);
        return;
      }
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[PersonnelParserOok][${account.label}] No rows; reason=${result?.reason || "unknown"}`);
        return;
      }
      const rows = result.rows;
      this.personnelAutoSearched.delete(account.id);
      if (!rows.length) {
        console.log(`[PersonnelParserOok][${account.label}] Empty personnel list`);
        return;
      }
      const db = getPersonnelDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[PersonnelParserOok][${account.label}] Ingested ${rows.length} OOK personnel: created=${r.created}, updated=${r.updated}. Total=${db.countPersonnel(account.id)}`);
      this.pushStoreToSidebar(win, account);
      pushPersonnelList(account.id, rows);
      if (this.personnelBatchDetailDone.has(account.id) || this.pendingPersonnelBatchDetail)
        return;
      win.webContents.executeJavaScript(`
        (function() {
          var f = document.getElementById('ook12001') || document.forms['ook12001'];
          if (!f) return null;
          var fields = {};
          for (var i = 0; i < f.elements.length; i++) {
            var el = f.elements[i];
            if (el.type === 'hidden') fields[el.name] = el.value;
          }
          return fields;
        })()
      `).then((formState) => {
        if (!formState || typeof formState !== "object") {
          console.log(`[PersonnelBatch][${account.label}] Could not capture form state \u2014 skipping detail batch`);
          return;
        }
        const totalRows = rows.length;
        console.log(`[PersonnelBatch][${account.label}] Starting detail scrape batch for ${totalRows} records`);
        this.pendingPersonnelBatchDetail = {
          accountId: account.id,
          totalRows,
          currentIndex: 0,
          formState
        };
        this.triggerPersonnelAcPostback(win, account, 0);
      }).catch((e) => {
        console.error(`[PersonnelBatch][${account.label}] Form state capture failed:`, e);
      });
    }).catch((e) => {
      console.error(`[PersonnelParserOok][${account.label}] Scrape failed:`, e);
    });
  }
  /**
   * Trigger the ASP.NET postback for the Nth row of the dgPersonelArama grid.
   * Row 0 fires `__doPostBack` directly because we are still on the ook12001
   * results page. Subsequent rows have already navigated to ook12002, so we
   * synthesise a form POST back to ook12001 using the VIEWSTATE captured from
   * the original results page (`pendingPersonnelBatchDetail.formState`).
   */
  triggerPersonnelAcPostback(win, account, index) {
    if (win.isDestroyed())
      return;
    const batch = this.pendingPersonnelBatchDetail;
    if (!batch || batch.accountId !== account.id)
      return;
    console.log(`[PersonnelBatch][${account.label}] Triggering A\xE7 postback row ${index + 1}/${batch.totalRows}`);
    if (index === 0) {
      win.webContents.executeJavaScript(`
        (function() {
          try {
            if (typeof __doPostBack === 'function') {
              __doPostBack('dgPersonelArama', 'Select$0');
              return true;
            }
            var f = document.getElementById('ook12001') || document.forms['ook12001'];
            if (f && f.elements['__EVENTTARGET'] && f.elements['__EVENTARGUMENT']) {
              f.elements['__EVENTTARGET'].value = 'dgPersonelArama';
              f.elements['__EVENTARGUMENT'].value = 'Select$0';
              f.submit();
              return true;
            }
            return false;
          } catch (e) {
            console.log('[MEBBIS] PersonnelBatch postback 0 error: ' + e);
            return false;
          }
        })()
      `).then((ok) => {
        if (!ok) {
          console.log(`[PersonnelBatch][${account.label}] Postback row 0 failed \u2014 aborting batch`);
          this.pendingPersonnelBatchDetail = null;
        }
      }).catch((e) => {
        console.error(`[PersonnelBatch][${account.label}] Postback row 0 JS error:`, e);
        this.pendingPersonnelBatchDetail = null;
      });
      return;
    }
    const formStateJson = JSON.stringify(batch.formState).replace(/<\/script/gi, "<\\/script");
    win.webContents.executeJavaScript(`
      (function() {
        try {
          var fields = ${formStateJson};
          fields['__EVENTTARGET'] = 'dgPersonelArama';
          fields['__EVENTARGUMENT'] = 'Select$${index}';
          var f = document.createElement('form');
          f.method = 'post';
          f.action = 'https://mebbis.meb.gov.tr/Ookgm/ook12001.aspx';
          for (var k in fields) {
            if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
            var inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = k;
            inp.value = fields[k];
            f.appendChild(inp);
          }
          document.body.appendChild(f);
          f.submit();
          return true;
        } catch (e) {
          console.log('[MEBBIS] PersonnelBatch postback error: ' + e);
          return false;
        }
      })()
    `).then((ok) => {
      if (!ok) {
        console.log(`[PersonnelBatch][${account.label}] Postback row ${index} failed \u2014 aborting batch`);
        this.pendingPersonnelBatchDetail = null;
      }
    }).catch((e) => {
      console.error(`[PersonnelBatch][${account.label}] Postback row ${index} JS error:`, e);
      this.pendingPersonnelBatchDetail = null;
    });
  }
  /**
   * Scrape detail fields from a loaded ook12002 page (one personel), persist
   * via PersonnelDb.ingestDetail, push the detail to the backend, then advance
   * the batch index. When the batch finishes, mark the account as done so a
   * re-visit to ook12001 in this session does not re-trigger the scrape.
   */
  scrapePersonnelDetail(win, account) {
    if (win.isDestroyed())
      return;
    const batch = this.pendingPersonnelBatchDetail;
    if (!batch || batch.accountId !== account.id)
      return;
    win.webContents.executeJavaScript(`
      (function() {
        function txt(id) {
          var el = document.getElementById(id);
          return el ? (el.innerText || el.textContent || '').trim() : '';
        }
        function val(id) {
          var el = document.getElementById(id);
          return el ? (el.value || '').trim() : '';
        }
        var progs = [];
        var pRows = document.querySelectorAll('#dgDerseGirecegiProgram tr');
        for (var i = 0; i < pRows.length; i++) {
          if (pRows[i].classList.contains('frmListBaslik')) continue;
          var cells = pRows[i].querySelectorAll('td');
          if (cells.length >= 2) {
            progs.push({
              program: (cells[0].innerText || cells[0].textContent || '').trim(),
              tip:     (cells[1].innerText || cells[1].textContent || '').trim()
            });
          }
        }
        return {
          tc:                            txt('lblTcKimlikNo'),
          ad:                            txt('lblAd'),
          soyad:                         txt('lblSoyad'),
          dogumTarihi:                   txt('lblDogumTarihi'),
          ogrenimBilgisi:                txt('lblOgrenimBilgisi'),
          mezuniyetBelgeCinsi:           txt('lblMezuniyetBelgeCinsi'),
          mezuniyetTarihi:               txt('lblMezuniyetTarihi'),
          mezuniyetBelgeTarihi:          txt('lblMezuniyetBelgeTarihi'),
          mezuniyetBelgeSayisi:          txt('lblMezuniyetBelgeSayisi'),
          mezuniyetAciklama:             txt('lblMezuniyetAciklama'),
          gorevi:                        txt('lblGorevi'),
          statusu:                       txt('lblStatusu'),
          bransi:                        txt('lblBransi'),
          dersUcret:                     txt('lblDersUcret'),
          netBrutUcret:                  txt('lblNetUcretBrutUcret'),
          calismaIzniBas:                txt('lblCalismaIzniBaslamaTarihi'),
          calismaIzniBit:                txt('lblCalismaIzniBitisTarihi'),
          maasKarsiligiDersSayisi:       txt('lblMaasKarsiligiDersSayisi'),
          dersUcretiKarsiligiDersSayisi: txt('lblDersUcretiKarsiligiDersSayisi'),
          durumu:                        txt('lblDurumu'),
          ayrilmaAciklama:               txt('lblAyrilmaAciklama'),
          ePosta:                        val('txtePosta'),
          tel:                           val('txtTel'),
          derseProgramlar:               progs
        };
      })()
    `).then((detail) => {
      if (detail && detail.tc) {
        getPersonnelDb().ingestDetail(account.id, detail.tc, detail);
        console.log(`[PersonnelBatch][${account.label}] Detail scraped: TC=${detail.tc} (${batch.currentIndex + 1}/${batch.totalRows})`);
        pushPersonnelDetail(account.id, { tc: detail.tc, ...detail });
      } else {
        console.log(`[PersonnelBatch][${account.label}] ook12002 at index ${batch.currentIndex}: no TC found, skipping`);
      }
      batch.currentIndex++;
      if (batch.currentIndex < batch.totalRows) {
        this.triggerPersonnelAcPostback(win, account, batch.currentIndex);
      } else {
        console.log(`[PersonnelBatch][${account.label}] Personnel detail batch complete \u2014 ${batch.totalRows} records scraped`);
        this.personnelBatchDetailDone.add(account.id);
        this.pendingPersonnelBatchDetail = null;
        this.pushStoreToSidebar(win, account);
      }
    }).catch((e) => {
      console.error(`[PersonnelBatch][${account.label}] scrapePersonnelDetail failed at index ${batch.currentIndex}:`, e);
      this.pendingPersonnelBatchDetail = null;
    });
  }
  serializeStore(account) {
    const students = getStudentDb().serialize(account.id);
    const personnel = getPersonnelDb().serialize(account.id);
    const kurumInfo = this.kurumInfoCache.get(account.id) || null;
    const cars = this.carsCache.get(account.id) || null;
    return { ...students, personnel: personnel.personnel, kurumInfo, cars };
  }
  pushStoreToSidebar(win, account) {
    if (win.isDestroyed())
      return;
    const payload = this.serializeStore(account);
    console.log(`[Sidebar][${account.label}] Pushing store: ${payload.students.length} students, ${payload.plates.length} plates, ${payload.personnel.length} personnel, kurumInfo=${payload.kurumInfo ? "yes" : "no"}`);
    const json = JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");
    win.webContents.executeJavaScript(`
      (function() {
        try {
          window.__mebbisStore = ${json};
          if (typeof window.__mebbisRenderStore === 'function') {
            window.__mebbisRenderStore();
            console.log('[MEBBIS_SIDEBAR] Store re-rendered: ' + window.__mebbisStore.students.length + ' students, ' + window.__mebbisStore.plates.length + ' plates, ' + (window.__mebbisStore.personnel || []).length + ' personnel');
          } else {
            console.log('[MEBBIS_SIDEBAR] Store stashed but no renderer yet');
          }
        } catch (e) {
          console.log('[MEBBIS_SIDEBAR] Push failed: ' + e);
        }
      })();
    `).catch((e) => console.error(`[Sidebar][${account.label}] Push failed:`, e));
    if (!this.kurumInfoCache.has(account.id) && !this.kurumInfoFetching.has(account.id)) {
      this.kurumInfoFetching.add(account.id);
      fetchKurumInfo().then((info) => {
        this.kurumInfoFetching.delete(account.id);
        if (!info)
          return;
        this.kurumInfoCache.set(account.id, info);
        if (!win.isDestroyed())
          this.pushStoreToSidebar(win, account);
      }).catch(() => {
        this.kurumInfoFetching.delete(account.id);
      });
    }
    if (!this.carsCache.has(account.id) && !this.carsFetching.has(account.id)) {
      this.carsFetching.add(account.id);
      fetchCars().then((cars) => {
        this.carsFetching.delete(account.id);
        if (!cars)
          return;
        this.carsCache.set(account.id, cars);
        if (!win.isDestroyed())
          this.pushStoreToSidebar(win, account);
      }).catch(() => {
        this.carsFetching.delete(account.id);
      });
    }
  }
  openStudent(win, account, tc) {
    if (win.isDestroyed()) {
      console.log(`[OpenStudent][${account.label}] Window destroyed, aborting tc=${tc}`);
      return;
    }
    if (!tc || !/^\d{11}$/.test(tc)) {
      console.log(`[OpenStudent][${account.label}] Invalid TC '${tc}', aborting`);
      return;
    }
    if (this.pendingDownload || this.pendingBatchDownload || this.pendingSimulatorReport) {
      console.log(`[OpenStudent][${account.label}] A download/batch is in progress, ignoring open-student tc=${tc}`);
      return;
    }
    console.log(`[OpenStudent][${account.label}] Navigating to skt00001 to open tc=${tc}`);
    this.pendingOpenStudent.set(account.id, { tc, phase: "skt-module" });
    win.loadURL("https://mebbis.meb.gov.tr/SKT/skt00001.aspx").catch((e) => {
      console.error(`[OpenStudent][${account.label}] loadURL failed:`, e);
      this.pendingOpenStudent.delete(account.id);
    });
  }
  fillTcAndSubmit(win, tc) {
    if (win.isDestroyed())
      return;
    win.webContents.executeJavaScript(`
      (function() {
        const tcInput = document.getElementById('txtTcKimlikNo');
        if (!tcInput) {
          console.log('[MEBBIS] fillTcAndSubmit: txtTcKimlikNo not found');
          return;
        }
        tcInput.value = '${tc}';
        tcInput.dispatchEvent(new Event('change', { bubbles: true }));
        tcInput.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          const btn = document.getElementById('ImageButton1') ||
                      document.querySelector('input[id*="ImageButton"]') ||
                      document.querySelector('input[type="image"]');
          if (btn) {
            console.log('[MEBBIS] fillTcAndSubmit: clicking search button');
            btn.click();
          } else {
            const form = tcInput.closest('form');
            if (form) { console.log('[MEBBIS] fillTcAndSubmit: submitting form'); form.submit(); }
            else { console.log('[MEBBIS] fillTcAndSubmit: no submit target found'); }
          }
        }, 300);
      })();
    `).catch((e) => console.error(`[OpenStudent] fillTcAndSubmit failed:`, e));
  }
  async injectLeftMenu(win, account) {
    if (win.isDestroyed())
      return;
    const fallback = `
      (function() {
        if (document.getElementById('mebbis-left-menu')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'mebbis-left-menu';
        sidebar.style.cssText = 'position: fixed; left: 0; top: 0; bottom: 0; width: 200px; z-index: 10000; background: #1a1a2e; border-right: 1px solid #2a2a4a; display: flex; flex-direction: column; color: white; font-family: Arial, sans-serif; overflow-y: auto;';

        const title = document.createElement('div');
        title.style.cssText = 'padding: 15px; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #4361ee;';
        title.textContent = 'Menu';
        sidebar.appendChild(title);

        const items = [
          { label: 'Direksiyon Takip \u0130ndir', action: 'direksiyon' },
          { label: '\xC7oklu Direksiyon Takip', action: 'coklu-direksiyon' },
          { label: 'Simulasyon Raporu Olu\u015Ftur', action: 'simulasyon' },
          { label: '\xC7oklu Simulasyon Raporu', action: 'coklu-simulasyon' },
        ];

        items.forEach(item => {
          const btn = document.createElement('button');
          btn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 14px; transition: all 0.2s;';
          btn.textContent = item.label;
          btn.onmouseover = () => {
            btn.style.background = '#2a2a4a';
            btn.style.color = '#4361ee';
          };
          btn.onmouseout = () => {
            btn.style.background = 'none';
            btn.style.color = '#ccc';
          };
          btn.onclick = () => {
            if (item.action === 'simulasyon') {
              // Show simulator report modal with simulator type selection
              let overlay = document.getElementById('mebbis-modal-overlay');
              if (overlay) { overlay.remove(); }

              overlay = document.createElement('div');
              overlay.id = 'mebbis-modal-overlay';
              overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

              const modal = document.createElement('div');
              modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 380px; font-family: Arial, sans-serif; color: white;';

              const modalTitle = document.createElement('h3');
              modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
              modalTitle.textContent = 'Simulasyon Raporu \u0130ndir';
              modal.appendChild(modalTitle);

              const tcLabel = document.createElement('label');
              tcLabel.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
              tcLabel.textContent = 'TC Kimlik No';
              modal.appendChild(tcLabel);

              const tcInput = document.createElement('input');
              tcInput.type = 'text';
              tcInput.maxLength = 11;
              tcInput.placeholder = 'TC Kimlik No';
              tcInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 16px;';
              tcInput.onfocus = () => { tcInput.style.borderColor = '#4361ee'; };
              tcInput.onblur = () => { tcInput.style.borderColor = '#2a2a4a'; };
              modal.appendChild(tcInput);

              const simTypeLabel = document.createElement('label');
              simTypeLabel.style.cssText = 'display: block; margin-bottom: 12px; font-size: 14px; color: #ccc;';
              simTypeLabel.textContent = 'Sim\xFClasyon Makinesi';
              modal.appendChild(simTypeLabel);

              const radioContainer = document.createElement('div');
              radioContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';

              const sesimRadio = document.createElement('label');
              sesimRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              sesimRadio.innerHTML = '<input type="radio" name="simType" value="sesim" style="margin-right: 8px;"> Sesim (1 rapor)';
              radioContainer.appendChild(sesimRadio);

              const anagrupRadio = document.createElement('label');
              anagrupRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              anagrupRadio.innerHTML = '<input type="radio" name="simType" value="ana_grup" style="margin-right: 8px;"> Ana Grup (11 rapor)';
              radioContainer.appendChild(anagrupRadio);

              const bothRadio = document.createElement('label');
              bothRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              bothRadio.innerHTML = '<input type="radio" name="simType" value="both" checked style="margin-right: 8px;"> Her \u0130kisi (12 rapor)';
              radioContainer.appendChild(bothRadio);

              modal.appendChild(radioContainer);

              const btnRow = document.createElement('div');
              btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = '\u0130ptal';
              cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
              cancelBtn.onclick = () => { overlay.remove(); };
              btnRow.appendChild(cancelBtn);

              const submitBtn = document.createElement('button');
              submitBtn.textContent = '\u0130ndir';
              submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
              submitBtn.onclick = () => {
                const tc = tcInput.value.trim();
                if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                  tcInput.style.borderColor = '#ff4444';
                  return;
                }
                const simType = document.querySelector('input[name="simType"]:checked')?.value || 'sesim';
                console.log('MEBBIS_SIMULATION_REPORT:' + tc + '|||' + simType);
                submitBtn.disabled = true;
                submitBtn.textContent = 'Y\xFCkleniyor...';
                submitBtn.style.opacity = '0.6';
              };
              btnRow.appendChild(submitBtn);

              modal.appendChild(btnRow);
              overlay.appendChild(modal);
              overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
              document.body.appendChild(overlay);
              tcInput.focus();
              return;
            }

            if (item.action === 'coklu-direksiyon') {
              console.log('MEBBIS_BATCH_DIREKSIYON');
              return;
            }

            if (item.action === 'coklu-simulasyon') {
              console.log('MEBBIS_BATCH_SIMULATOR');
              return;
            }

            // Show TC modal for Direksiyon Takip
            let overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) { overlay.remove(); }

            overlay = document.createElement('div');
            overlay.id = 'mebbis-modal-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 350px; font-family: Arial, sans-serif; color: white;';

            const modalTitle = document.createElement('h3');
            modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
            modalTitle.textContent = 'Direksiyon Takip \u0130ndir';
            modal.appendChild(modalTitle);

            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            label.textContent = 'TC Giriniz';
            modal.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 11;
            input.placeholder = 'TC Kimlik No';
            input.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
            input.onfocus = () => { input.style.borderColor = '#4361ee'; };
            input.onblur = () => { input.style.borderColor = '#2a2a4a'; };
            modal.appendChild(input);

            const sinifLabel = document.createElement('label');
            sinifLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            sinifLabel.textContent = 'S\u0131n\u0131f Se\xE7iniz';
            modal.appendChild(sinifLabel);

            const sinifSelect = document.createElement('select');
            sinifSelect.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; cursor: pointer;';
            sinifSelect.onfocus = () => { sinifSelect.style.borderColor = '#4361ee'; };
            sinifSelect.onblur = () => { sinifSelect.style.borderColor = '#2a2a4a'; };
            const sinifOptions = [
              { label: 'Otomatik (ders say\u0131s\u0131na g\xF6re)', value: '' },
              { label: 'Yeni B (16 ders)', value: '0,B|16' },
              { label: 'Yeni A (14 ders)', value: '0,A|14' },
              { label: 'Yeni A1 (14 ders)', value: '0,A1|14' },
              { label: 'Yeni A2 (14 ders)', value: '0,A2|14' },
              { label: 'Yeni M (14 ders)', value: '0,M|14' },
              { label: 'Yeni B1 (14 ders)', value: '0,B1|14' },
              { label: 'Yeni F (14 ders)', value: '0,F|14' },
              // --- Motosiklet S\u0131n\u0131f\u0131 Ge\xE7i\u015Fleri ---
              { label: 'A1 \u2192 A2 (8 ders)', value: 'A1,A2|8' },
              { label: 'A1-A2 \u2192 A (8 ders)', value: 'A1-A2,A|8' },
              { label: 'M \u2192 A (14 ders)', value: 'M,A|14' },
              { label: 'M-B1 \u2192 A1 (14 ders)', value: 'M-B1,A1|14' },
              { label: 'M-B1 \u2192 A2 (14 ders)', value: 'M-B1,A2|14' },
              { label: 'B-C-D-F-G \u2192 A1 (14 ders)', value: 'B-C-D-F-G,A1|14' },
              { label: 'B-C-D-F-G \u2192 A2 (14 ders)', value: 'B-C-D-F-G,A2|14' },
              { label: 'B-C-D-F-G \u2192 A (14 ders)', value: 'B-C-D-F-G,A|14' },
              { label: 'B1 \u2192 A1-A2-A (14 ders)', value: 'B1,A1-A2-A|14' },
              { label: 'E (17.04.2015 \xD6ncesi) \u2192 A1 (14 ders)', value: 'E(17.04.2015 \xD6ncesi),A1|14' },
              { label: 'E (17.04.2015 \xD6ncesi) \u2192 A2 (14 ders)', value: 'E(17.04.2015 \xD6ncesi),A2|14' },
              { label: 'E (17.04.2015 \xD6ncesi) \u2192 A (14 ders)', value: 'E(17.04.2015 \xD6ncesi),A|14' },

              // --- B / B1 Ge\xE7i\u015Fleri ---
              { label: 'A1-A2-A \u2192 B (16 ders)', value: 'A1-A2-A,B|16' },
              { label: 'A1-A2-A \u2192 B1 (8 ders)', value: 'A1-A2-A,B1|8' },
              { label: 'A1-A2-A (17.04.2015 \xD6ncesi) \u2192 B1 (8 ders)', value: 'A1-A2-A(17.04.2015 \xD6ncesi),B1|8' },
              { label: 'F \u2192 B (16 ders)', value: 'F,B|16' },
              { label: 'G \u2192 B (16 ders)', value: 'G,B|16' },
              { label: 'M \u2192 B (16 ders)', value: 'M,B|16' },
              { label: 'M \u2192 B1 (14 ders)', value: 'M,B1|14' },
              { label: 'B1 \u2192 B (14 ders)', value: 'B1,B|14' },
              { label: 'G \u2192 F (14 ders)', value: 'G,F|14' },

              // --- A\u011F\u0131r Vas\u0131ta (C / C1 / D / D1) ---
              { label: 'B \u2192 C (22 ders)', value: 'B,C|22' },
              { label: 'B (17.04.2015 \xD6ncesi) \u2192 C (16 ders)', value: 'B(17.04.2015 \xD6ncesi),C|16' },
              { label: 'B \u2192 D (16 ders)', value: 'B,D|16' },
              { label: 'B (17.04.2015 \xD6ncesi) \u2192 D (9 ders)', value: 'B(17.04.2015 \xD6ncesi),D|9' },
              { label: 'B \u2192 D1 (9 ders)', value: 'B,D1|9' },
              { label: 'B \u2192 C1 (12 ders)', value: 'B,C1|12' },
              { label: 'B (17.04.2015 \xD6ncesi) \u2192 C1 (7 ders)', value: 'B(17.04.2015 \xD6ncesi),C1|7' },
              { label: 'C1 \u2192 C-D (12 ders)', value: 'C1,C-D|12' },
              { label: 'C1-C \u2192 D1 (6 ders)', value: 'C1-C,D1|6' },
              { label: 'C \u2192 D (9 ders)', value: 'C,D|9' },
              { label: 'D \u2192 C (12 ders)', value: 'D,C|12' },
              { label: 'D1 \u2192 C (16 ders)', value: 'D1,C|16' },
              { label: 'D1 \u2192 D (9 ders)', value: 'D1,D|9' },
              { label: 'D1-D \u2192 C1 (7 ders)', value: 'D1-D,C1|7' },

              // --- Otomatik \u2192 Manuel ---
              { label: 'A Otomatik \u2192 A Manuel (9 ders)', value: 'A Otomatik,A Manuel|9' },
              { label: 'B Otomatik \u2192 B Manuel (10 ders)', value: 'B Otomatik,B Manuel|10' },
              { label: 'C Otomatik \u2192 C Manuel (12 ders)', value: 'C Otomatik,C Manuel|12' },
              { label: 'D Otomatik \u2192 D Manuel (9 ders)', value: 'D Otomatik,D Manuel|9' },

              // --- R\xF6mork (E S\u0131n\u0131flar\u0131) ---
              { label: 'B \u2192 BE (8 ders)', value: 'B,BE|8' },
              { label: 'C \u2192 CE (8 ders)', value: 'C,CE|8' },
              { label: 'D \u2192 DE (8 ders)', value: 'D,DE|8' },
              { label: 'C1 \u2192 C1E (8 ders)', value: 'C1,C1E|8' },
              { label: 'D1 \u2192 D1E (8 ders)', value: 'D1,D1E|8' },
            ];
            sinifOptions.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt.value;
              option.textContent = opt.label;
              option.style.cssText = 'color: white; background-color: #16213e;';
              sinifSelect.appendChild(option);
            });
            modal.appendChild(sinifSelect);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '\u0130ptal';
            cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
            cancelBtn.onclick = () => { overlay.remove(); };
            btnRow.appendChild(cancelBtn);

            const submitBtn = document.createElement('button');
            submitBtn.textContent = '\u0130ndir';
            submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
            submitBtn.onclick = () => {
              const tc = input.value.trim();
              if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                input.style.borderColor = '#ff4444';
                return;
              }
              console.log('MEBBIS_DOWNLOAD_TC:' + tc + '|||' + sinifSelect.value);
              submitBtn.disabled = true;
              submitBtn.textContent = 'Y\xFCkleniyor...';
              submitBtn.style.opacity = '0.6';
            };
            btnRow.appendChild(submitBtn);

            modal.appendChild(btnRow);
            overlay.appendChild(modal);
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
            input.focus();
          };
          sidebar.appendChild(btn);
        });

        ${!import_electron5.app.isPackaged ? `
        // Developer menu section
        const devTitle = document.createElement('div');
        devTitle.id = 'mebbis-dev-section-title';
        devTitle.style.cssText = 'padding: 10px 15px; border-top: 2px solid #ff6b35; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #ff6b35; font-size: 12px; margin-top: auto;';
        devTitle.textContent = '\u2699 Developer';
        sidebar.appendChild(devTitle);

        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'dev-auto-refresh-btn';
        refreshBtn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 13px; transition: all 0.2s;';
        refreshBtn.textContent = '\u27F3 Auto Refresh (30s)';
        refreshBtn.onmouseover = () => { refreshBtn.style.background = '#2a2a4a'; refreshBtn.style.color = '#ff6b35'; };
        refreshBtn.onmouseout = () => { if (!refreshBtn.dataset.active) { refreshBtn.style.background = 'none'; refreshBtn.style.color = '#ccc'; } };
        refreshBtn.onclick = () => {
          const isActive = refreshBtn.dataset.active === '1';
          if (isActive) {
            refreshBtn.dataset.active = '';
            refreshBtn.textContent = '\u27F3 Auto Refresh (30s)';
            refreshBtn.style.background = 'none';
            refreshBtn.style.color = '#ccc';
          } else {
            refreshBtn.dataset.active = '1';
            refreshBtn.textContent = '\u27F3 Auto Refresh (ON)';
            refreshBtn.style.background = '#3a1a0a';
            refreshBtn.style.color = '#ff6b35';
          }
          console.log('MEBBIS_DEV_AUTO_REFRESH');
        };
        sidebar.appendChild(refreshBtn);
        ` : ""}

        if (document.body) {
          document.body.appendChild(sidebar);
          const style = document.createElement('style');
          style.textContent = 'body { margin-left: 200px !important; } main { margin-left: 0 !important; }';
          document.head.appendChild(style);
          console.log('[MEBBIS] Left menu injected');
        }
      })();
    `;
    await (0, import_remote_code_loader.getCodeLoader)().runScriptOrFallback(win, "scripts/left-menu.js", fallback);
    await this.injectStoreSidebarSections(win, account);
    this.pushStoreToSidebar(win, account);
  }
  async injectStoreSidebarSections(win, account) {
    if (win.isDestroyed())
      return;
    console.log(`[Sidebar][${account.label}] Injecting \xD6\u011Frenciler & Ara\xE7lar sections + renderer`);
    const script = `
      (function() {
        const sidebar = document.getElementById('mebbis-left-menu');
        if (!sidebar) {
          console.log('[MEBBIS_SIDEBAR] No #mebbis-left-menu found, skipping store sections');
          return;
        }
        if (document.getElementById('mebbis-store-container')) {
          console.log('[MEBBIS_SIDEBAR] Store sections already present, skipping');
          return;
        }

        const container = document.createElement('div');
        container.id = 'mebbis-store-container';
        container.style.cssText = 'border-top: 1px solid #2a2a4a; margin-top: 8px;';

        function makeSectionBtn(id, label) {
          const b = document.createElement('button');
          b.id = id;
          b.dataset.label = label;
          b.style.cssText = 'background: none; border: none; color: #4361ee; font-size: 13px; font-weight: bold; padding: 12px 15px; text-align: left; cursor: pointer; width: 100%; border-bottom: 1px solid #2a2a4a; letter-spacing: 0.3px; transition: background 0.15s;';
          b.textContent = label + ' (0)';
          b.onmouseover = () => { b.style.background = '#2a2a4a'; };
          b.onmouseout = () => { b.style.background = 'none'; };
          return b;
        }

        const studentsBtn  = makeSectionBtn('mebbis-students-btn',  '\xD6\u011Frenciler');
        const carsBtn      = makeSectionBtn('mebbis-cars-btn',      'Ara\xE7lar');
        const personnelBtn = makeSectionBtn('mebbis-personnel-btn', 'Personeller');
        // "Kurum" shows kurum bilgileri + programs + vehicles. Renders "Kurum (\u2014)"
        // until the lazy fetch resolves; "(\u2713)" once cached.
        const kurumBtn = (function() {
          const b = document.createElement('button');
          b.id = 'mebbis-kurum-btn';
          b.dataset.label = 'Kurum';
          b.style.cssText = 'background: none; border: none; color: #4361ee; font-size: 13px; font-weight: bold; padding: 12px 15px; text-align: left; cursor: pointer; width: 100%; border-bottom: 1px solid #2a2a4a; letter-spacing: 0.3px; transition: background 0.15s;';
          b.textContent = 'Kurum (\u2014)';
          b.onmouseover = () => { b.style.background = '#2a2a4a'; };
          b.onmouseout  = () => { b.style.background = 'none'; };
          return b;
        })();
        container.appendChild(kurumBtn);
        container.appendChild(studentsBtn);
        container.appendChild(carsBtn);
        container.appendChild(personnelBtn);
        // Insert above the dev section if present; otherwise append at the end.
        const devAnchor = document.getElementById('mebbis-dev-section-title');
        if (devAnchor) {
          sidebar.insertBefore(container, devAnchor);
        } else {
          sidebar.appendChild(container);
        }
        console.log('[MEBBIS_SIDEBAR] Store section buttons injected');

        let activeModalKeyHandler = null;
        function closeStoreModal() {
          const m = document.getElementById('mebbis-store-modal');
          if (m) m.remove();
          if (activeModalKeyHandler) {
            document.removeEventListener('keydown', activeModalKeyHandler);
            activeModalKeyHandler = null;
          }
        }

        // \u2500\u2500\u2500 Table modal with optional live search + header actions \u2500\u2500\u2500
        // opts: { kind, title, columns, rows, onRowAction?, headerActions?,
        //         searchKeys?: string[], searchPlaceholder?: string }
        function openTableModal(opts) {
          closeStoreModal();
          const overlay = document.createElement('div');
          overlay.id = 'mebbis-store-modal';
          if (opts.kind) overlay.dataset.kind = opts.kind;
          overlay.style.cssText = 'position: fixed; left: 200px; top: 0; right: 0; bottom: 0; z-index: 10001; background: #16213e; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column;';

          const modal = document.createElement('div');
          modal.style.cssText = 'flex: 1; display: flex; flex-direction: column; padding: 20px; min-height: 0;';

          const header = document.createElement('div');
          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; gap: 12px;';
          const titleEl = document.createElement('h3');
          titleEl.style.cssText = 'margin: 0; color: #4361ee; font-size: 18px; flex: 1; min-width: 0;';
          titleEl.textContent = opts.title;
          const rightSide = document.createElement('div');
          rightSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';
          if (Array.isArray(opts.headerActions)) {
            opts.headerActions.forEach(action => {
              const ab = document.createElement('button');
              ab.style.cssText = 'background: #4361ee; border: none; color: white; cursor: pointer; padding: 6px 14px; font-size: 13px; border-radius: 4px; font-weight: 500;';
              ab.textContent = action.label;
              ab.onclick = () => action.onClick(ab);
              rightSide.appendChild(ab);
            });
          }
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '\u2715';
          closeBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 8px; line-height: 1;';
          closeBtn.onclick = closeStoreModal;
          rightSide.appendChild(closeBtn);
          header.appendChild(titleEl);
          header.appendChild(rightSide);
          modal.appendChild(header);

          // Optional live search bar \u2014 present when opts.searchKeys is a non-empty array.
          let searchInput = null;
          if (Array.isArray(opts.searchKeys) && opts.searchKeys.length) {
            const searchWrap = document.createElement('div');
            searchWrap.style.cssText = 'margin-bottom: 10px; flex-shrink: 0;';
            searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = opts.searchPlaceholder || 'Ara...';
            searchInput.style.cssText = 'width: 100%; padding: 9px 12px; border: 1px solid #2a2a4a; border-radius: 4px; background: #1a1a2e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
            searchInput.onfocus = () => { searchInput.style.borderColor = '#4361ee'; };
            searchInput.onblur = () => { searchInput.style.borderColor = '#2a2a4a'; };
            searchWrap.appendChild(searchInput);
            modal.appendChild(searchWrap);
          }

          const tableWrap = document.createElement('div');
          tableWrap.style.cssText = 'overflow: auto; flex: 1;';
          const table = document.createElement('table');
          table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
          const thead = document.createElement('thead');
          const trh = document.createElement('tr');
          opts.columns.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = 'text-align: left; padding: 8px 12px; border-bottom: 2px solid #2a2a4a; color: #4361ee; font-weight: 600; position: sticky; top: 0; background: #16213e;';
            th.textContent = col.label;
            trh.appendChild(th);
          });
          thead.appendChild(trh);
          table.appendChild(thead);
          const tbody = document.createElement('tbody');

          // Render the given rows into tbody. Used both for the initial draw
          // and to re-render after a search filter applies.
          function renderRows(rows) {
            tbody.innerHTML = '';
            if (!rows.length) {
              const tr = document.createElement('tr');
              const td = document.createElement('td');
              td.colSpan = opts.columns.length;
              td.style.cssText = 'padding: 20px; text-align: center; color: #888; font-style: italic;';
              td.textContent = '\u2014 e\u015Fle\u015Fme yok \u2014';
              tr.appendChild(td);
              tbody.appendChild(tr);
              return;
            }
            rows.forEach(row => {
              const tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              opts.columns.forEach(col => {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 8px 12px; color: #ddd;';
                if (col.action && opts.onRowAction) {
                  const btn = document.createElement('button');
                  btn.style.cssText = 'background: #2a2a4a; border: none; color: #4361ee; cursor: pointer; padding: 4px 12px; font-size: 12px; border-radius: 3px;';
                  btn.textContent = col.action;
                  btn.onclick = () => opts.onRowAction(row);
                  td.appendChild(btn);
                } else {
                  td.textContent = row[col.key] != null ? String(row[col.key]) : '';
                }
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
          }

          if (!opts.rows.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = opts.columns.length;
            td.style.cssText = 'padding: 20px; text-align: center; color: #888; font-style: italic;';
            td.textContent = '\u2014 hen\xFCz yok \u2014';
            tr.appendChild(td);
            tbody.appendChild(tr);
          } else {
            renderRows(opts.rows);
          }

          if (searchInput) {
            searchInput.oninput = () => {
              const q = searchInput.value.toLocaleLowerCase('tr-TR').trim();
              if (!q) { renderRows(opts.rows); return; }
              const filtered = opts.rows.filter(row => {
                for (let i = 0; i < opts.searchKeys.length; i++) {
                  const v = row[opts.searchKeys[i]];
                  if (v != null && String(v).toLocaleLowerCase('tr-TR').indexOf(q) !== -1) return true;
                }
                return false;
              });
              renderRows(filtered);
            };
          }

          table.appendChild(tbody);
          tableWrap.appendChild(table);
          modal.appendChild(tableWrap);

          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) closeStoreModal(); };
          document.body.appendChild(overlay);

          activeModalKeyHandler = (e) => { if (e.key === 'Escape') closeStoreModal(); };
          document.addEventListener('keydown', activeModalKeyHandler);
        }

        function personnelGuncelle(btn) {
          if (btn) { btn.disabled = true; btn.textContent = 'Y\xFCkleniyor...'; btn.style.opacity = '0.6'; }
          // Main process handles MTSK\u2192OOK module switch (Mod\xFCl \xC7\u0131k\u0131\u015F) and
          // ook00001 \u2192 ook12001 chain navigation, then runs the detail batch.
          console.log('MEBBIS_REQUEST_PERSONNEL_UPDATE');
        }

        function studentGuncelle(btn) {
          if (btn) { btn.disabled = true; btn.textContent = 'Y\xFCkleniyor...'; btn.style.opacity = '0.6'; }
          // Main process navigates to skt02006 (or clicks into it from /skt/)
          // then shows the filter dialog; submit re-POSTs and the list page
          // falls into parseAndIngestStudentList (already pushes to backend).
          console.log('MEBBIS_REQUEST_STUDENT_UPDATE');
        }

        // \u2500\u2500\u2500 Personel Detay modal \u2500\u2500\u2500
        // Section-by-section overlay. Sections collapse/expand on header click;
        // the first non-empty section is open by default. Empty sections (every
        // field '' or '-') hide entirely so the user only sees data MEBBIS
        // actually returned.
        function showPersonnelDetail(row) {
          var ov = document.createElement('div');
          ov.style.cssText = 'position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';
          var box = document.createElement('div');
          box.style.cssText = 'background: #1a1a2e; border: 1px solid #4361ee; border-radius: 8px; width: 560px; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; color: white;';
          var head = document.createElement('div');
          head.style.cssText = 'padding: 16px 20px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('div');
          t.style.cssText = 'color: #4361ee; font-size: 16px; font-weight: bold;';
          t.textContent = row.adSoyad || ((row.ad || '') + ' ' + (row.soyad || '')).trim() || 'Personel';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          sub.textContent = 'TC ' + (row.tc || '-') + (row.durumu ? ' \u2022 ' + row.durumu : '');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);
          var closeBtn = document.createElement('button');
          closeBtn.textContent = '\u2715';
          closeBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 6px; line-height: 1;';
          closeBtn.onclick = function() { ov.remove(); };
          head.appendChild(titleWrap);
          head.appendChild(closeBtn);
          box.appendChild(head);

          var body = document.createElement('div');
          body.style.cssText = 'padding: 8px 20px 20px; overflow-y: auto; flex: 1;';

          var sections = [
            { title: 'Kimlik',          fields: [
              ['TC Kimlik No', row.tc], ['Ad', row.ad], ['Soyad', row.soyad],
              ['Do\u011Fum Tarihi', row.dogumTarihi],
            ]},
            { title: 'G\xF6rev',           fields: [
              ['G\xF6revi', row.gorevi], ['Stat\xFCs\xFC', row.statusu], ['Bran\u015F\u0131', row.bransi],
              ['Ek Bran\u015F 1', row.brans2], ['Ek Bran\u015F 2', row.brans3], ['Ek Bran\u015F 3', row.brans4],
            ]},
            { title: '\xC7al\u0131\u015Fma \u0130zni',    fields: [
              ['\u0130zin No', row.izinNo],
              ['Ba\u015Flama Tarihi', row.calismaIzniBas], ['Biti\u015F Tarihi', row.calismaIzniBit],
              ['Durumu', row.durumu], ['Ayr\u0131lma Tarihi', row.ayrilmaTarihi],
              ['Ayr\u0131lma A\xE7\u0131klama', row.ayrilmaAciklama],
            ]},
            { title: '\xDCcret',           fields: [
              ['Ders \xDCcreti', row.dersUcret], ['Net / Br\xFCt \xDCcret', row.netBrutUcret],
              ['Maa\u015F KDS', row.maasKds], ['\xDCcret KDS', row.ucretKds],
              ['Maa\u015F Kar\u015F\u0131l\u0131\u011F\u0131 Ders Say\u0131s\u0131', row.maasKarsiligiDersSayisi],
              ['Ders \xDCcreti Kar\u015F\u0131l\u0131\u011F\u0131 Ders Say\u0131s\u0131', row.dersUcretiKarsiligiDersSayisi],
            ]},
            { title: '\xD6\u011Frenim',         fields: [
              ['\xD6\u011Frenim Bilgisi', row.ogrenimBilgisi],
              ['Mezuniyet Belge Cinsi', row.mezuniyetBelgeCinsi],
              ['Mezuniyet Tarihi', row.mezuniyetTarihi],
              ['Mezuniyet Belge Tarihi', row.mezuniyetBelgeTarihi],
              ['Mezuniyet Belge Say\u0131s\u0131', row.mezuniyetBelgeSayisi],
              ['Mezuniyet A\xE7\u0131klama', row.mezuniyetAciklama],
            ]},
            { title: 'Kurum',           fields: [
              ['Kurum Kodu', row.kurumKodu], ['Kurum Ad\u0131', row.kurumAdi],
              ['G\xF6rev Ba\u015Flama Kurum Ad\u0131', row.kurumAdiBaslangic],
              ['\u0130l', row.il], ['\u0130l\xE7e', row.ilce],
            ]},
            { title: '\u0130leti\u015Fim',        fields: [
              ['e-Posta', row.ePosta], ['Telefon', row.tel],
            ]},
          ];

          function hasValue(v) {
            return v !== null && v !== undefined &&
              String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== '&nbsp;';
          }

          var sectionRendered = 0;
          sections.forEach(function(sec) {
            var visibleFields = sec.fields.filter(function(f) { return hasValue(f[1]); });
            if (!visibleFields.length) return;
            var openByDefault = (sectionRendered === 0);
            sectionRendered++;
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '\u25BE';
            var hLbl = document.createElement('span');
            hLbl.textContent = sec.title + '  (' + visibleFields.length + ')';
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            visibleFields.forEach(function(f) {
              var rowEl = document.createElement('div');
              rowEl.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
              var k = document.createElement('div');
              k.style.cssText = 'color: #888; flex: 0 0 180px;';
              k.textContent = f[0];
              var v = document.createElement('div');
              v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
              v.textContent = String(f[1]).replace(/\\u00a0/g, ' ').trim();
              rowEl.appendChild(k);
              rowEl.appendChild(v);
              content.appendChild(rowEl);
            });
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            body.appendChild(secEl);
          });

          // Programs section: table-shaped, rendered separately from the
          // key/value sections above.
          if (Array.isArray(row.derseProgramlar) && row.derseProgramlar.length) {
            var pSec = document.createElement('div');
            pSec.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var pHdr = document.createElement('button');
            pHdr.type = 'button';
            pHdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var pCaret = document.createElement('span');
            pCaret.style.cssText = 'color: #888; font-size: 12px;';
            pCaret.textContent = '\u25BE';
            var pLbl = document.createElement('span');
            pLbl.textContent = 'Derse Girece\u011Fi Programlar  (' + row.derseProgramlar.length + ')';
            pHdr.appendChild(pLbl);
            pHdr.appendChild(pCaret);
            var pContent = document.createElement('div');
            pContent.style.cssText = 'padding: 10px 14px; background: #16162a;';
            row.derseProgramlar.forEach(function(p) {
              var r = document.createElement('div');
              r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; gap: 8px;';
              var n = document.createElement('div');
              n.style.cssText = 'color: #ddd; flex: 1;';
              n.textContent = p.program;
              var ty = document.createElement('div');
              ty.style.cssText = 'color: #888; flex: 0 0 100px; text-align: right;';
              ty.textContent = p.tip || '';
              r.appendChild(n); r.appendChild(ty);
              pContent.appendChild(r);
            });
            pHdr.onclick = function() {
              var open = pContent.style.display !== 'none';
              pContent.style.display = open ? 'none' : 'block';
              pCaret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            pSec.appendChild(pHdr);
            pSec.appendChild(pContent);
            body.appendChild(pSec);
          }

          if (!sectionRendered && !(Array.isArray(row.derseProgramlar) && row.derseProgramlar.length)) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            empty.textContent = 'Detay hen\xFCz \xE7ekilmedi \u2014 G\xFCncelle butonu ile yeniden deneyin.';
            body.appendChild(empty);
          }

          box.appendChild(body);
          ov.appendChild(box);
          ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
          document.body.appendChild(ov);
          var keyH = function(e) {
            if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', keyH); }
          };
          document.addEventListener('keydown', keyH);
        }

        function fmtTimestamp(ms) {
          if (!ms || typeof ms !== 'number') return '';
          var d = new Date(ms);
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        // \u2500\u2500\u2500 \xD6\u011Frenci Detay modal \u2500\u2500\u2500
        // Cached detail overlay with a G\xFCncelle/Detay \xC7ek button. The button
        // emits MEBBIS_OPEN_STUDENT which navigates skt02009 to (re-)scrape.
        // After parseAndLogStudentPage ingests + pushStoreToSidebar refreshes
        // window.__mebbisStore, the next open of this modal sees fresh data.
        function showStudentDetail(row) {
          var ov = document.createElement('div');
          ov.style.cssText = 'position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';
          var box = document.createElement('div');
          box.style.cssText = 'background: #1a1a2e; border: 1px solid #4361ee; border-radius: 8px; width: 640px; max-width: 92vw; max-height: 88vh; display: flex; flex-direction: column; color: white;';
          var head = document.createElement('div');
          head.style.cssText = 'padding: 14px 18px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('div');
          t.style.cssText = 'color: #4361ee; font-size: 16px; font-weight: bold;';
          t.textContent = row.adSoyad || '\xD6\u011Frenci';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          var subParts = ['TC ' + (row.tc || '-')];
          if (row.donemi) subParts.push(row.donemi);
          if (row.grubu)  subParts.push(row.grubu);
          if (row.durumu) subParts.push(row.durumu);
          sub.textContent = subParts.join(' \u2022 ');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);

          var rightWrap = document.createElement('div');
          rightWrap.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-shrink: 0;';

          var updateBtn = document.createElement('button');
          updateBtn.type = 'button';
          updateBtn.textContent = row.hasDetail ? 'G\xFCncelle' : 'Detay \xC7ek';
          updateBtn.style.cssText = 'background: #4361ee; border: none; color: white; cursor: pointer; padding: 7px 14px; font-size: 13px; border-radius: 4px; font-weight: 500;';
          updateBtn.onclick = function() {
            updateBtn.disabled = true;
            updateBtn.textContent = 'Y\xFCkleniyor...';
            updateBtn.style.opacity = '0.6';
            console.log('[MEBBIS_SIDEBAR] Detay update for tc=' + row.tc);
            console.log('MEBBIS_OPEN_STUDENT:' + row.tc);
            // Close both this overlay and the table modal so the user can
            // see the MEBBIS browser doing the navigation.
            ov.remove();
            closeStoreModal();
          };
          rightWrap.appendChild(updateBtn);

          var sCloseBtn = document.createElement('button');
          sCloseBtn.textContent = '\u2715';
          sCloseBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 6px; line-height: 1;';
          sCloseBtn.onclick = function() { ov.remove(); };
          rightWrap.appendChild(sCloseBtn);

          head.appendChild(titleWrap);
          head.appendChild(rightWrap);
          box.appendChild(head);

          // Meta strip: last scrape timestamp (or call-to-action when missing).
          var meta = document.createElement('div');
          meta.style.cssText = 'padding: 8px 18px; background: #16162a; border-bottom: 1px solid #20203a; font-size: 12px; color: #888; flex-shrink: 0;';
          var stamp = fmtTimestamp(row.lastDetailSeenAt);
          meta.textContent = row.hasDetail
            ? ('Son detay g\xFCncellemesi: ' + (stamp || '-'))
            : 'Detay hen\xFCz \xE7ekilmedi \u2014 yukar\u0131daki "Detay \xC7ek" ile ba\u015Flat\u0131n.';
          box.appendChild(meta);

          var body = document.createElement('div');
          body.style.cssText = 'padding: 8px 18px 18px; overflow-y: auto; flex: 1;';

          function makeSection(titleText, openByDefault, badge) {
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '\u25BE';
            var hLbl = document.createElement('span');
            hLbl.textContent = titleText + (badge != null ? '  (' + badge + ')' : '');
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            return { el: secEl, body: content };
          }

          function addKV(parent, key, val) {
            var r = document.createElement('div');
            r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
            var k = document.createElement('div');
            k.style.cssText = 'color: #888; flex: 0 0 200px;';
            k.textContent = key;
            var v = document.createElement('div');
            v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
            v.textContent = val == null || val === '' ? '-' : String(val);
            r.appendChild(k);
            r.appendChild(v);
            parent.appendChild(r);
          }

          var anyRendered = false;

          // Section: Kay\u0131t Bilgileri (key/value)
          var kayitFields = [
            ['Kurum', row.kurum], ['D\xF6nemi', row.donemi], ['Grubu', row.grubu], ['\u015Eubesi', row.subesi],
            ['Mevcut S\xFCr\xFCc\xFC Belgesi', row.mevcutBelge], ['\u0130stenen Sertifika', row.istenenSertifika],
            ['Kurum Onay\u0131', row.kurumOnay], ['\u0130l\xE7e Onay\u0131', row.ilceOnay],
            ['Uygulama', row.uygulama], ['Durumu', row.durumu],
            ['Teorik Hak', row.teorikHak], ['Uygulama Hak', row.uygulamaHak],
            ['E-S\u0131nav Hak', row.eSinavHak], ['Kay\u0131t \xDCcreti', row.kayitUcreti],
          ].filter(function(f) {
            return f[1] !== null && f[1] !== undefined && String(f[1]).trim() !== '' && String(f[1]).trim() !== '-';
          });
          if (kayitFields.length) {
            var kayit = makeSection('Kay\u0131t Bilgileri', true, kayitFields.length);
            kayitFields.forEach(function(f) { addKV(kayit.body, f[0], f[1]); });
            body.appendChild(kayit.el);
            anyRendered = true;
          }

          // Section: S\u0131navlar (table)
          var exams = Array.isArray(row.exams) ? row.exams : [];
          if (exams.length) {
            var sinav = makeSection('S\u0131navlar', false, exams.length);
            var tbl = document.createElement('table');
            tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var sThead = document.createElement('thead');
            var sTrh = document.createElement('tr');
            ['D\xF6nem','Kod','Tarih','Plaka','Usta \xD6\u011Fretici','Onay','Durum','Sonu\xE7'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              sTrh.appendChild(th);
            });
            sThead.appendChild(sTrh);
            tbl.appendChild(sThead);
            var sTb = document.createElement('tbody');
            exams.forEach(function(e) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [e.donemi, e.sinavKodu, e.sinavTarihi, e.plaka, e.ustaOgretici, e.onayDurumu, e.sinavDurumu, e.sonuc].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              sTb.appendChild(tr);
            });
            tbl.appendChild(sTb);
            sinav.body.appendChild(tbl);
            body.appendChild(sinav.el);
            anyRendered = true;
          }

          // Section: Dersler (table)
          var lessons = Array.isArray(row.lessons) ? row.lessons : [];
          if (lessons.length) {
            var ders = makeSection('Dersler', false, lessons.length);
            var lTbl = document.createElement('table');
            lTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var lThead = document.createElement('thead');
            var lTrh = document.createElement('tr');
            ['D\xF6nem','Grup','\u015Eube','Plaka','Yer','Tarih','Saat','Personel','T\xFCr'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              lTrh.appendChild(th);
            });
            lThead.appendChild(lTrh);
            lTbl.appendChild(lThead);
            var lTb = document.createElement('tbody');
            lessons.forEach(function(l) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [l.donemi, l.grupAdi, l.subesi, l.plaka, l.dersYeri, l.dersTarihi, l.dersSaati, l.personel, l.egitimTuru].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              lTb.appendChild(tr);
            });
            lTbl.appendChild(lTb);
            ders.body.appendChild(lTbl);
            body.appendChild(ders.el);
            anyRendered = true;
          }

          // Section: Plakalar (chips)
          var plates = Array.isArray(row.plates) ? row.plates : [];
          if (plates.length) {
            var plkSec = makeSection('Plakalar', false, plates.length);
            var chips = document.createElement('div');
            chips.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
            plates.forEach(function(p) {
              var chip = document.createElement('span');
              chip.style.cssText = 'background: #20203a; color: #ddd; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;';
              chip.textContent = p;
              chips.appendChild(chip);
            });
            plkSec.body.appendChild(chips);
            body.appendChild(plkSec.el);
            anyRendered = true;
          }

          if (!anyRendered) {
            var sEmpty = document.createElement('div');
            sEmpty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            sEmpty.textContent = row.hasDetail
              ? 'Detay var ama doldurulacak alan bulunamad\u0131.'
              : 'Detay hen\xFCz \xE7ekilmedi. "Detay \xC7ek" ile ba\u015Flat\u0131n.';
            body.appendChild(sEmpty);
          }

          box.appendChild(body);
          ov.appendChild(box);
          ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
          document.body.appendChild(ov);
          var keyH = function(e) {
            if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', keyH); }
          };
          document.addEventListener('keydown', keyH);
        }

        // \u2500\u2500\u2500 Kurum panel \u2500\u2500\u2500
        // Renders in the content pane (to the right of the 200px sidebar),
        // matching openTableModal's layout. Reuses #mebbis-store-modal so
        // opening \xD6\u011Frenciler/Personeller/Ara\xE7lar/Kurum swaps content cleanly
        // and closeStoreModal works the same way (\u2715 button or Escape).
        function showKurumDetail() {
          closeStoreModal();
          var info = (window.__mebbisStore && window.__mebbisStore.kurumInfo) || null;

          var overlay = document.createElement('div');
          overlay.id = 'mebbis-store-modal';
          overlay.dataset.kind = 'kurum';
          overlay.style.cssText = 'position: fixed; left: 200px; top: 0; right: 0; bottom: 0; z-index: 10001; background: #16213e; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column;';

          var pane = document.createElement('div');
          pane.style.cssText = 'flex: 1; display: flex; flex-direction: column; padding: 20px; min-height: 0;';

          var header = document.createElement('div');
          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; gap: 12px;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('h3');
          t.style.cssText = 'margin: 0; color: #4361ee; font-size: 18px;';
          t.textContent = (info && info.kurum_adi) || 'Kurum Bilgileri';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          var subParts = [];
          if (info && info.kurum_kodu)    subParts.push('Kod ' + info.kurum_kodu);
          if (info && info.kurum_telefon) subParts.push(info.kurum_telefon);
          sub.textContent = subParts.join(' \u2022 ');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);

          var kCloseBtn = document.createElement('button');
          kCloseBtn.textContent = '\u2715';
          kCloseBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 8px; line-height: 1;';
          kCloseBtn.onclick = closeStoreModal;
          header.appendChild(titleWrap);
          header.appendChild(kCloseBtn);
          pane.appendChild(header);

          // Meta strip \u2014 mirrors the \xD6\u011Frenci Detay style
          var meta = document.createElement('div');
          meta.style.cssText = 'padding: 8px 0; font-size: 12px; color: #888; flex-shrink: 0;';
          if (info && info.last_scraped_at) {
            meta.textContent = 'Son g\xFCncelleme: ' + fmtTimestamp(info.last_scraped_at);
          } else {
            meta.textContent = 'Kurum bilgisi hen\xFCz \xE7ekilmedi.';
          }
          pane.appendChild(meta);

          var body = document.createElement('div');
          body.style.cssText = 'overflow-y: auto; flex: 1; padding-bottom: 4px;';

          if (!info) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            empty.textContent = 'Hen\xFCz kurum bilgisi bulunamad\u0131. MEBBIS\\'te skt01001 sayfas\u0131na bir kez girince kay\u0131tlar gelir.';
            body.appendChild(empty);
            pane.appendChild(body);
            overlay.appendChild(pane);
            overlay.onclick = function(e) { if (e.target === overlay) closeStoreModal(); };
            document.body.appendChild(overlay);
            activeModalKeyHandler = function(e) { if (e.key === 'Escape') closeStoreModal(); };
            document.addEventListener('keydown', activeModalKeyHandler);
            return;
          }

          function makeSectionLocal(titleText, openByDefault, badge) {
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '\u25BE';
            var hLbl = document.createElement('span');
            hLbl.textContent = titleText + (badge != null ? '  (' + badge + ')' : '');
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            return { el: secEl, body: content };
          }

          function addKVLocal(parent, key, val) {
            var r = document.createElement('div');
            r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
            var k = document.createElement('div');
            k.style.cssText = 'color: #888; flex: 0 0 200px;';
            k.textContent = key;
            var v = document.createElement('div');
            v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
            v.textContent = val == null || val === '' ? '-' : String(val);
            r.appendChild(k);
            r.appendChild(v);
            parent.appendChild(r);
          }

          // Section: Bilgiler
          var bilgiler = [
            ['Kurum Ad\u0131',      info.kurum_adi],
            ['Kurum Kodu',     info.kurum_kodu],
            ['Telefon',        info.kurum_telefon],
            ['Adres',          info.kurum_adres],
            ['Bina Kontenjan', info.bina_kontenjan],
            ['A\xE7\u0131lma Tarihi',  info.acilma_tarihi],
          ].filter(function(f) {
            return f[1] !== null && f[1] !== undefined && String(f[1]).trim() !== '';
          });
          if (bilgiler.length) {
            var bsec = makeSectionLocal('Kurum Bilgileri', true, bilgiler.length);
            bilgiler.forEach(function(f) { addKVLocal(bsec.body, f[0], f[1]); });
            body.appendChild(bsec.el);
          }

          // Section: Programlar (table)
          var progs = Array.isArray(info.programs) ? info.programs : [];
          if (progs.length) {
            var psec = makeSectionLocal('Programlar', false, progs.length);
            var pTbl = document.createElement('table');
            pTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var pThead = document.createElement('thead');
            var pTrh = document.createElement('tr');
            ['Ehliyet S\u0131n\u0131f\u0131','Ruhsat Tarihi','Kapanma Tarihi','Durum'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              pTrh.appendChild(th);
            });
            pThead.appendChild(pTrh);
            pTbl.appendChild(pThead);
            var pTb = document.createElement('tbody');
            progs.forEach(function(p) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [p.ehliyet_sinifi, p.ruhsat_tarihi, p.kapanma_tarihi, p.durum].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              pTb.appendChild(tr);
            });
            pTbl.appendChild(pTb);
            psec.body.appendChild(pTbl);
            body.appendChild(psec.el);
          }

          // Section: Ara\xE7lar (table)
          var vehs = Array.isArray(info.vehicles) ? info.vehicles : [];
          if (vehs.length) {
            var vsec = makeSectionLocal('Ara\xE7lar', false, vehs.length);
            var vTbl = document.createElement('table');
            vTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var vThead = document.createElement('thead');
            var vTrh = document.createElement('tr');
            ['Plaka','S\u0131n\u0131f','Marka','Model','Y\u0131l','Tescil','Giri\u015F','\xC7\u0131k\u0131\u015F','Durum','Onay'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              vTrh.appendChild(th);
            });
            vThead.appendChild(vTrh);
            vTbl.appendChild(vThead);
            var vTb = document.createElement('tbody');
            vehs.forEach(function(v) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [v.plaka, v.ehliyet_sinifi, v.marka, v.model, v.model_yili, v.tescil_tarihi, v.hizmete_giris, v.hizmetten_cikis, v.durum, v.mem_onay].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              vTb.appendChild(tr);
            });
            vTbl.appendChild(vTb);
            vsec.body.appendChild(vTbl);
            body.appendChild(vsec.el);
          }

          pane.appendChild(body);
          overlay.appendChild(pane);
          document.body.appendChild(overlay);
          activeModalKeyHandler = function(e) { if (e.key === 'Escape') closeStoreModal(); };
          document.addEventListener('keydown', activeModalKeyHandler);
        }

        studentsBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [] };
          openTableModal({
            kind: 'students',
            title: '\xD6\u011Frenciler (' + store.students.length + ')',
            columns: [
              { key: 'tc',      label: 'TC Kimlik' },
              { key: 'adSoyad', label: 'Ad Soyad' },
              { key: 'detay',   label: '', action: 'Detay' },
            ],
            rows: store.students,
            searchKeys: ['tc', 'adSoyad'],
            searchPlaceholder: 'TC veya Ad Soyad ile ara...',
            onRowAction: (row) => { showStudentDetail(row); },
            headerActions: [
              { label: 'G\xFCncelle', onClick: studentGuncelle },
            ],
          });
        };

        carsBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          openTableModal({
            kind: 'cars',
            title: 'Ara\xE7lar (' + store.plates.length + ')',
            columns: [{ key: 'plate', label: 'Plaka' }],
            rows: store.plates.map(p => ({ plate: p })),
          });
        };

        kurumBtn.onclick = () => { showKurumDetail(); };

        personnelBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          const rows = (store.personnel || []);
          openTableModal({
            kind: 'personnel',
            title: 'Personeller (' + rows.length + ')',
            columns: [
              { key: 'adSoyad',        label: 'Ad Soyad' },
              { key: 'tc',             label: 'TC' },
              { key: 'gorevi',         label: 'G\xF6revi' },
              { key: 'statusu',        label: 'Stat\xFCs\xFC' },
              { key: 'bransi',         label: 'Bran\u015F' },
              { key: 'calismaIzniBit', label: '\u0130zin Biti\u015F' },
              { key: 'detay',          label: '', action: 'Detay' },
            ],
            rows: rows,
            searchKeys: ['adSoyad', 'tc', 'gorevi', 'bransi'],
            searchPlaceholder: 'Ad Soyad, TC, g\xF6rev veya bran\u015F ile ara...',
            onRowAction: showPersonnelDetail,
            headerActions: [
              { label: 'G\xFCncelle', onClick: personnelGuncelle },
            ],
          });
        };

        window.__mebbisRenderStore = function() {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          const sBtn = document.getElementById('mebbis-students-btn');
          const cBtn = document.getElementById('mebbis-cars-btn');
          const pBtn = document.getElementById('mebbis-personnel-btn');
          const kBtn = document.getElementById('mebbis-kurum-btn');
          if (sBtn) sBtn.textContent = '\xD6\u011Frenciler (' + store.students.length + ')';
          if (cBtn) cBtn.textContent = 'Ara\xE7lar (' + store.plates.length + ')';
          if (pBtn) pBtn.textContent = 'Personeller (' + (store.personnel || []).length + ')';
          if (kBtn) kBtn.textContent = 'Kurum (' + (store.kurumInfo ? '\u2713' : '\u2014') + ')';
          // Refresh the open modal in place so the new rows appear without flicker.
          const open = document.getElementById('mebbis-store-modal');
          if (open) {
            const kind = open.dataset.kind;
            if      (kind === 'students'  && sBtn) sBtn.click();
            else if (kind === 'cars'      && cBtn) cBtn.click();
            else if (kind === 'personnel' && pBtn) pBtn.click();
          }
          console.log('[MEBBIS_SIDEBAR] Counts updated: ' + store.students.length + ' students, ' + store.plates.length + ' plates, ' + (store.personnel || []).length + ' personnel');
        };

        if (window.__mebbisStore) {
          window.__mebbisRenderStore();
        }
      })();
    `;
    await win.webContents.executeJavaScript(script).catch((e) => {
      console.error(`[Sidebar][${account.label}] Section injection failed:`, e);
    });
  }
  stop(accountId) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      const partition = `persist:mebbis-${accountId}`;
      const ses = import_electron5.session.fromPartition(partition);
      ses.cookies.flushStore().then(() => {
        console.log(`[${entry.account.label}] Cookies flushed to disk`);
      }).catch((e) => console.error("Flush error:", e));
      entry.window.close();
    }
    this.running.delete(accountId);
    this.loginAttempts.delete(accountId);
    this.pendingOpenStudent.delete(accountId);
    this.demoSessionUsage.delete(accountId);
  }
  focus(accountId) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      entry.window.focus();
    }
  }
  isRunning(accountId) {
    const entry = this.running.get(accountId);
    return !!entry && !entry.window.isDestroyed();
  }
  /**
   * Local test mode: opens a window WITHOUT logging into MEBBIS.
   * Shows a static "Local Test Mode" overlay so the operator can exercise
   * PDF generation against cached local data without hitting MEBBIS at all.
   */
  startLocalTest(account, parentWindow) {
    console.log(`
========== STARTING LOCAL TEST: ${account.label} ==========`);
    const existing = this.running.get(account.id);
    if (existing && !existing.window.isDestroyed()) {
      existing.window.focus();
      return;
    }
    const partition = `persist:mebbis-localtest-${account.id}`;
    const win = new import_electron5.BrowserWindow({
      width: 1280,
      height: 900,
      title: `Local Test - ${account.label}`,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: true
      },
      show: false
    });
    win.removeMenu();
    this.running.set(account.id, { account, window: win });
    win.on("closed", () => {
      this.running.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send("account:stopped", account.id);
      }
    });
    win.once("ready-to-show", () => win.show());
    win.webContents.once("did-finish-load", () => {
      this.injectLeftMenu(win, account).catch((e) => {
        console.error(`[LocalTest][${account.label}] injectLeftMenu failed:`, e);
      });
    });
    const labelSafe = account.label.replace(/[<>&"]/g, "");
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Local Test - ${labelSafe}</title>
<style>
  html,body{margin:0;height:100%;background:#0f0f1e;color:#e6e6f0;font-family:Arial,sans-serif;}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;text-align:center;padding:0 24px;}
  .badge{background:#4361ee;color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;letter-spacing:2px;font-weight:700;}
  h1{margin:0;font-size:26px;}
  .sub{color:#9aa0bf;font-size:14px;max-width:520px;line-height:1.6;}
  .school{color:#fff;font-weight:600;}
</style></head>
<body>
  <div class="wrap">
    <div class="badge">LOCAL TEST</div>
    <h1>MEBBIS oturumu a\xE7\u0131lmad\u0131</h1>
    <div class="sub">
      <div class="school">${labelSafe}</div>
      Bu pencere yerel \xF6nbellek verisi \xFCzerinde PDF \xFCretimini test etmek i\xE7indir.
      MEBBIS'e ba\u011Flan\u0131lmam\u0131\u015Ft\u0131r; "G\xFCncelle" i\u015Flemleri devre d\u0131\u015F\u0131d\u0131r.
    </div>
  </div>
</body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }
  isLoginPage(url) {
    const lower = url.toLowerCase();
    if (lower.includes("default.aspx"))
      return true;
    return false;
  }
  /**
   * True for any pre-authenticated MEBBIS screen where the left menu must NOT
   * be injected:
   *   - default.aspx              → username/password form
   *   - redirect.aspx             → 2FA verification (MEB Ajanda code / e-Devlet bridge)
   * After the user passes the verification screen, MEBBIS lands on an SKT
   * module page and the menu is injected as usual.
   */
  isPreAuthPage(url) {
    const lower = url.toLowerCase();
    return lower.includes("default.aspx") || lower.includes("redirect.aspx");
  }
  async saveResponse(win, account, url) {
    try {
      if (win.isDestroyed())
        return;
      const html = await win.webContents.executeJavaScript("document.documentElement.outerHTML");
      await getRequestLogger().recordResponse(win.webContents, account.label, url, html);
    } catch (e) {
      console.error(`[${account.label}] Failed to save response:`, e);
    }
  }
  async downloadDireksiyonTakip(tc, _partition, account, parentWin, sinif) {
    console.log(`[${account.label}] Starting direksiyon takip download for TC: ${tc}, sinif: ${sinif}`);
    parentWin.webContents.executeJavaScript(`
      (function() {
        let status = document.getElementById('mebbis-modal-status');
        if (!status) {
          const modal = document.querySelector('#mebbis-modal-overlay > div');
          if (modal) {
            status = document.createElement('div');
            status.id = 'mebbis-modal-status';
            status.style.cssText = 'margin-top: 12px; padding: 8px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
            modal.appendChild(status);
          }
        }
        if (status) status.textContent = 'Sayfaya y\xF6nlendiriliyor...';
      })();
    `).catch(() => {
    });
    this.pendingDownload = { tc, sinif: sinif || "", account, parentWin };
    const currentURL = parentWin.webContents.getURL().toLowerCase();
    if (currentURL.includes("skt00001") || currentURL.includes("/skt/")) {
      this.pendingDownloadPhase = "navigate";
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      this.pendingDownloadPhase = "skt-module";
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          // Find the "\xD6zel MTSK Mod\xFCl\xFC" menu item that navigates to /SKT/skt00001.aspx
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu item, clicking...');
              td.click();
              return true;
            }
          }
          // Also try finding tr with onclick
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu row, clicking...');
              tr.click();
              return true;
            }
          }
          console.log('[MEBBIS] SKT module menu not found');
          return false;
        })();
      `).catch(() => false);
      if (!clicked) {
        this.pendingDownload = null;
        this.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const status = document.getElementById('mebbis-modal-status');
            if (status) { status.textContent = 'Hata: SKT men\xFCs\xFC bulunamad\u0131'; status.style.color = '#ff4444'; }
            const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '\u0130ndir'; submitBtn.style.opacity = '1'; }
          })();
        `).catch(() => {
        });
      }
    }
  }
  async clickMenuItemForSkt02009(win, account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        // MEBBIS menu items are td elements with onclick containing window.location.href
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02009')) {
            console.log('[MEBBIS] Found skt02009 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02009 menu item not found on this page');
        return false;
      })();
    `).catch(() => false);
    if (!clicked) {
      console.log(`[${account.label}] skt02009 menu not found, aborting`);
      this.pendingDownload = null;
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
      win.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) { status.textContent = 'Hata: Aday Durum men\xFCs\xFC bulunamad\u0131'; status.style.color = '#ff4444'; }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '\u0130ndir'; submitBtn.style.opacity = '1'; }
        })();
      `).catch(() => {
      });
    }
  }
  async handleSktModuleLoaded(win, account) {
    this.clickMenuItemForSkt02009(win, account);
  }
  async handleSkt02009Loaded(win, account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win)
      return;
    const { tc, parentWin } = this.pendingDownload;
    console.log(`[${account.label}] skt02009 loaded, filling TC: ${tc}`);
    parentWin.webContents.executeJavaScript(`
      (function() {
        const status = document.getElementById('mebbis-modal-status');
        if (status) status.textContent = 'TC giriliyor ve sorgulan\u0131yor...';
      })();
    `).catch(() => {
    });
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') || 
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                console.log('[MEBBIS] Clicking search button...');
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] TC fill error:`, e);
      this.pendingDownload = null;
      this.pendingDownloadPhase = null;
    }
  }
  async handleSkt02009Results(win, account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win)
      return;
    const { tc, sinif, parentWin } = this.pendingDownload;
    this.pendingDownload = null;
    console.log(`[${account.label}] skt02009 results loaded, scraping data... sinif: ${sinif}`);
    try {
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'Veriler okunuyor...';
        })();
      `).catch(() => {
      });
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          // Student info is in dgDonemBilgileri table (not separate labels)
          // Columns: 0=TC, 1=Ad Soyad, 2=Kurum, 3=D\xF6nemi, 4=Grubu, 5=\u015Eubesi, 6=Mevcut, 7=\u0130stenen Sertifika, ...
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = {
            'ad-soyad': '',
            'tc-kimlik-no': '${tc}',
            'istenen-sertifika': ''
          };
          
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          
          // Lesson data is in dgDersProgrami table
          // Columns: 0=D\xF6nemi, 1=Grup, 2=Ba\u015Flama, 3=\u015Eubesi, 4=Ara\xE7 Plakas\u0131, 5=Ders Yeri, 6=Ders Tarihi, 7=Ders Saati, 8=Personel, 9=E\u011Fitim T\xFCr\xFC
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');

          if (!lessonTable) {
            if (!studentInfo['ad-soyad']) {
              return { error: 'Veri bulunamad\u0131 - Direksiyon ders program\u0131 tablosu yok' };
            }
            return { error: 'Direksiyon ders program\u0131 bulunamad\u0131' };
          }

          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // Exclude "Ba\u015Far\u0131s\u0131z Aday E\u011Fitimi" rows
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Ba\u015Far\u0131s\u0131z Aday')) continue;
            lessons.push(cellTexts);
          }

          // Pick the chronologically newest period (column 0 = D\xF6nemi).
          // MEBBIS row order is unreliable \u2014 parse "YYYY - <month>" instead.
          const filteredLessons = _filterByNewest(lessons);

          return { studentInfo, lessons: filteredLessons };
        })();
      `);
      if (lessonData.error) {
        throw new Error(lessonData.error);
      }
      console.log(`[${account.label}] Lesson data received:`, JSON.stringify(lessonData.studentInfo), `${lessonData.lessons.length} lessons`);
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'PDF olu\u015Fturuluyor...';
        })();
      `).catch(() => {
      });
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons, sinif);
      const studentName = (lessonData.studentInfo["ad-soyad"] || "unknown").replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g, "_");
      const defaultFilename = `direksiyon_${tc}_${studentName}.pdf`;
      const result = await import_electron5.dialog.showSaveDialog(parentWin, {
        title: "Direksiyon Takip PDF Kaydet",
        defaultPath: defaultFilename,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (!result.canceled && result.filePath) {
        fs5.writeFileSync(result.filePath, pdfBuffer);
        console.log(`[${account.label}] PDF saved to: ${result.filePath}`);
        import_electron5.shell.showItemInFolder(result.filePath);
        this.logPdf(account, "direksiyon_takip", 1);
      }
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) overlay.remove();
        })();
      `).catch(() => {
      });
    } catch (error) {
      console.error(`[${account.label}] Download error:`, error);
      const errMsg = error?.message || "PDF olu\u015Fturulamad\u0131";
      import_electron5.dialog.showMessageBox(parentWin, {
        type: "error",
        title: "Direksiyon Takip Hatas\u0131",
        message: errMsg,
        buttons: ["Tamam"],
        noLink: true
      }).catch(() => {
      });
      const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, " ");
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) {
            status.textContent = 'Hata: ${escapedMsg}';
            status.style.color = '#ff4444';
          }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '\u0130ndir';
            submitBtn.style.opacity = '1';
          }
        })();
      `).catch(() => {
      });
    }
  }
  async handleSkt02009SimulatorLoaded(win, account) {
    if (!this.pendingSimulatorReport)
      return;
    const { tc } = this.pendingSimulatorReport;
    console.log(`[${account.label}] skt02009 loaded for simulator, filling TC: ${tc}`);
    const parentWin = this.running.get(account.id)?.window;
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) submitBtn.textContent = 'TC sorgulan\u0131yor...';
          }
        })();
      `).catch(() => {
      });
    }
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') ||
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] Simulator TC fill error:`, e);
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
    }
  }
  async handleSkt02009SimulatorResults(win, account) {
    if (!this.pendingSimulatorReport)
      return;
    const { tc, simulationType } = this.pendingSimulatorReport;
    this.pendingSimulatorReport = null;
    console.log(`[${account.label}] skt02009 simulator results loaded, scraping for ${simulationType}...`);
    const parentWin = this.running.get(account.id)?.window;
    try {
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'Veriler okunuyor...';
            }
          })();
        `).catch(() => {
        });
      }
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Direksiyon ders program\u0131 tablosu bulunamad\u0131' };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            lessons.push(cellTexts);
          }
          // Pick the chronologically newest period (column 0 = D\xF6nemi).
          const filteredLessons = _filterByNewest(lessons);
          return { studentInfo, lessons: filteredLessons };
        })();
      `);
      if (lessonData.error) {
        throw new Error(lessonData.error);
      }
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
      console.log(`[${account.label}] Found ${simulatorSessions.length} simulator sessions out of ${lessonData.lessons.length} total lessons`);
      if (simulatorSessions.length === 0) {
        throw new Error("Simulat\xF6r dersi bulunamad\u0131");
      }
      simulatorSessions.sort((a, b) => {
        const dateA = (a[6] || "").split("/").reverse().join("-");
        const dateB = (b[6] || "").split("/").reverse().join("-");
        if (dateA !== dateB)
          return dateB.localeCompare(dateA);
        const timeA = (a[7] || "").split("-")[0].trim();
        const timeB = (b[7] || "").split("-")[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'PDF olu\u015Fturuluyor...';
            }
          })();
        `).catch(() => {
        });
      }
      const savedDir = await this.generateSimulatorReportPdf(
        lessonData.studentInfo,
        simulatorSessions,
        simulationType,
        account,
        parentWin || win
      );
      console.log(`[${account.label}] Simulator + EK4 PDFs saved to: ${savedDir}`);
      import_electron5.shell.openPath(savedDir);
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) overlay.remove();
          })();
        `).catch(() => {
        });
      }
    } catch (error) {
      console.error(`[${account.label}] Simulator report error:`, error);
      const errMsg = error?.message || "Simulat\xF6r raporu olu\u015Fturulamad\u0131";
      if (parentWin && !parentWin.isDestroyed()) {
        import_electron5.dialog.showMessageBox(parentWin, {
          type: "error",
          title: "Simulat\xF6r Raporu Hatas\u0131",
          message: errMsg,
          buttons: ["Tamam"],
          noLink: true
        }).catch(() => {
        });
        const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, " ");
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Olu\u015Ftur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {
        });
      }
    }
  }
  fetchSimulatorTemplate(templateName) {
    const relPath = templateName.startsWith("ek4/") ? templateName : `simulator/${templateName}`;
    return fetchEncryptedTemplate(relPath);
  }
  async generatePdfFromHtml(html) {
    const pdfWin = new import_electron5.BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    pdfWin.close();
    return Buffer.from(pdfBuffer);
  }
  async generatePdfFromTemplate(studentInfo, lessons, sinif) {
    let selectedCount = null;
    let selectedClass = null;
    if (sinif) {
      const parts = sinif.split("|");
      if (parts.length === 2) {
        selectedCount = parseInt(parts[1], 10);
        const classParts = parts[0].split(",");
        selectedClass = classParts[1] || classParts[0];
      }
    }
    const lessonCount = selectedCount || lessons.length;
    const hasSimulator = lessons.some((l) => {
      const text = l.join(" ");
      return text.includes("Simulat\xF6r") || text.includes("Direksiyon E\u011Fitim Alan\u0131");
    });
    let filteredLessons = [...lessons];
    const supportedCounts = [4, 6, 7, 8, 9, 10, 12, 14, 16, 20, 22];
    let closestCount = 4;
    for (const count of supportedCounts) {
      if (lessonCount <= count) {
        closestCount = count;
        break;
      }
    }
    if (lessonCount > 22)
      closestCount = 22;
    let templateName = `${closestCount}n.html`;
    if (hasSimulator && [12, 14, 16].includes(closestCount)) {
      templateName = `${closestCount}nsimli.html`;
    } else {
      filteredLessons = filteredLessons.filter((l) => {
        const text = l.join(" ");
        return !text.includes("Simulat\xF6r") && !text.includes("Direksiyon E\u011Fitim Alan\u0131");
      });
    }
    if (filteredLessons.length > closestCount) {
      filteredLessons = filteredLessons.slice(-closestCount);
    }
    console.log(`[PDF] Fetching template: ${templateName} for ${lessonCount} lessons`);
    let html;
    try {
      html = await this.fetchTemplate(templateName);
    } catch (err) {
      throw new Error(`Template indirilemedi: ${templateName} - ${err.message}`);
    }
    const pdfWin = new import_electron5.BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const vClass = selectedClass || (studentInfo["istenen-sertifika"] || "B").split(" ")[0] || "B";
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        // Fill student info
        const nameEl = document.querySelector('.name');
        if (nameEl) nameEl.textContent = ${JSON.stringify(studentInfo["ad-soyad"] || "")};

        const tcEl = document.querySelector('.tc');
        if (tcEl) tcEl.textContent = ${JSON.stringify(studentInfo["tc-kimlik-no"] || "")};

        const classEl = document.querySelector('.vClass');
        if (classEl) classEl.textContent = '${vClass}';

        // Fill lesson records
        const dates = document.querySelectorAll('.date');
        const plates = document.querySelectorAll('.plate');
        const trainers = document.querySelectorAll('.mTrainer');
        const lessons = ${JSON.stringify(filteredLessons)};

        dates.forEach((el, idx) => {
          if (lessons[idx]) {
            // Lesson date is typically at index 6, time at index 7
            const date = lessons[idx][6] || lessons[idx][0] || '';
            const time = lessons[idx][7] || lessons[idx][1] || '';
            el.innerHTML = '<span style="font-size:9px">' + date + '</span>';
            if (time) el.innerHTML += '<br><span style="font-size:7px">' + time + '</span>';
          }
        });

        plates.forEach((el, idx) => {
          if (lessons[idx]) {
            let plate = lessons[idx][4] || lessons[idx][2] || '';
            plate = plate.replace('(Manuel)', '').replace('(Otomatik)', '').trim();
            el.textContent = plate;
          }
        });

        trainers.forEach((el, idx) => {
          if (lessons[idx]) {
            el.textContent = lessons[idx][8] || lessons[idx][3] || '';
          }
        });
      })();
    `);
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        const bodyHeight = document.body.scrollHeight;
        const pageHeightPx = 297 * 96 / 25.4; // A4=297mm at 96dpi ~1123px
        const stampReservePx = 26 * 96 / 25.4; // 26mm reserved for stamp ~99px
        const remaining = pageHeightPx - bodyHeight - stampReservePx;
        if (remaining > 10) {
          const cells = document.querySelectorAll('table td, table th');
          if (cells.length > 0) {
            const rows = document.querySelectorAll('table tr');
            const extraPerRow = remaining / rows.length / 2; // top + bottom
            cells.forEach(function(cell) {
              const current = parseFloat(getComputedStyle(cell).paddingTop) || 1;
              cell.style.paddingTop = (current + extraPerRow) + 'px';
              cell.style.paddingBottom = (current + extraPerRow) + 'px';
            });
          }
        }
      })();
    `);
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });
    pdfWin.close();
    return Buffer.from(pdfBuffer);
  }
  async handleSimulationReport(tc, simulationType, account, parentWin) {
    console.log(`[${account.label}] Simulator report for TC: ${tc}, simulationType: ${simulationType}`);
    this.pendingSimulatorReport = { tc, simulationType, account };
    try {
      await parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) {
              submitBtn.textContent = 'Veriler getiriliyor...';
              submitBtn.disabled = true;
              submitBtn.style.opacity = '0.6';
            }
          }
        })();
      `);
    } catch {
    }
    const currentURL = parentWin.webContents.getURL().toLowerCase();
    if (currentURL.includes("skt00001") || currentURL.includes("/skt/")) {
      this.pendingDownloadPhase = "navigate-simulator";
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      this.pendingDownloadPhase = "skt-module";
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              td.click();
              return true;
            }
          }
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              tr.click();
              return true;
            }
          }
          return false;
        })();
      `).catch(() => false);
      if (!clicked) {
        this.pendingSimulatorReport = null;
        this.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Olu\u015Ftur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {
        });
      }
    }
  }
  /**
   * Extract simulator sessions from lesson records
   * Returns only lessons where ders_yeri contains "Simulatör" or "Direksiyon Eğitim Alanı"
   */
  extractSimulatorSessions(lessons) {
    return lessons.filter((lesson) => {
      const dersYeri = lesson[5]?.trim() || "";
      return dersYeri.toLowerCase().includes("simulat\xF6r") || dersYeri.toLowerCase().includes("direksiyon e\u011Fitim");
    });
  }
  /**
   * Generate Simulator Report PDF locally
   * Similar to PDF generation flow but uses sesim/anagrup templates
   */
  async generateSimulatorReportPdf(studentInfo, simulatorSessions, simulationType, account, parentWindow) {
    console.log(`[${account.label}] Generating ${simulationType} simulator report PDF...`);
    console.log(`[${account.label}] Sessions to include: ${simulatorSessions.length}`);
    const result = await import_electron5.dialog.showOpenDialog(parentWindow, {
      title: "Simulat\xF6r Raporlar\u0131 - Klas\xF6r Se\xE7in",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) {
      throw new Error("Klas\xF6r se\xE7ilmedi");
    }
    const tc = studentInfo["tc-kimlik-no"] || "";
    const studentName = (studentInfo["ad-soyad"] || "unknown").replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, "").replace(/\s+/g, "_");
    const safeLabel = account.label.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, "").replace(/\s+/g, "_");
    const studentDir = path5.join(result.filePaths[0], `${tc}_${studentName}_${safeLabel}`);
    if (!fs5.existsSync(studentDir))
      fs5.mkdirSync(studentDir, { recursive: true });
    const record = simulatorSessions[0];
    const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
    const instructorName = record?.[8] || "Bilinmeyen";
    const date1 = record?.[6] || "";
    const time1 = record?.[7] || "";
    const donem = record?.[0] || "";
    const date2 = recordo?.[6] || "";
    const time2 = recordo?.[7] || "";
    const isDual = recordo !== null;
    if (simulationType === "sesim" || simulationType === "both") {
      const htmlContent = await this.generateSesimHtml(studentInfo, simulatorSessions, account.label);
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent);
      fs5.writeFileSync(path5.join(studentDir, "sesim.pdf"), pdfBuffer);
      console.log(`[${account.label}] Saved sesim.pdf`);
    }
    if (simulationType === "ana_grup" || simulationType === "both") {
      const scenarios = this.getAnagrupScenarios();
      const baseTemplate = await this.fetchSimulatorTemplate("anagrup/anagrup.html");
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        console.log(`[${account.label}] Generating anagrup PDF ${i + 1}/${scenarios.length}: ${scenario}`);
        const html = this.generateAnagrupHtml(baseTemplate, {
          studentName: studentInfo["ad-soyad"],
          instructorName,
          date1,
          time1,
          date2,
          time2,
          donem,
          scenario,
          accountLabel: account.label,
          isDual
        });
        const scenarioPdf = await this.generatePdfFromHtml(html);
        const safeScenarioName = scenario.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, "").trim();
        fs5.writeFileSync(path5.join(studentDir, `${i + 1}_${safeScenarioName}.pdf`), scenarioPdf);
      }
    }
    const ek4Html = await this.generateEk4Html(
      studentInfo["ad-soyad"],
      record?.[4] || "",
      // plaka (araç plakası col 4)
      instructorName,
      account.label,
      date1
      // tarih (ders tarihi)
    );
    const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
    fs5.writeFileSync(path5.join(studentDir, "ek4.pdf"), ek4Pdf);
    console.log(`[${account.label}] Saved ek4.pdf`);
    this.logPdf(account, "simulator_raporu", 1);
    return studentDir;
  }
  /**
   * Generate Sesim HTML from template with session data
   * Matches PHP sesimkaydet() for single session, sesimkaydet2() for dual sessions
   * Generates 16 timing rows with 6-min intervals (8-min for rows 8 and 16)
   * +18min break gap at row 8 for single session, switches to session 2 for dual
   */
  async generateSesimHtml(studentInfo, sessions, accountLabel) {
    const templateContent = await this.fetchSimulatorTemplate("sesim/sesim.html");
    let html = templateContent;
    const newestSession = sessions[0];
    const olderSession = sessions.length >= 2 ? sessions[1] : null;
    if (!newestSession)
      throw new Error("No simulator sessions found");
    const studentName = studentInfo["ad-soyad"] || "";
    const instructorName = newestSession[8] || "Bilinmeyen";
    const isDual = olderSession !== null;
    const parseStartTime = (timeStr) => {
      const cleaned = timeStr.replace(/\s/g, "");
      const startPart = cleaned.split("-")[0];
      const [h, m] = startPart.split(":").map(Number);
      const d = new Date(2e3, 0, 1, h, m, 0);
      return d;
    };
    const formatTime = (d) => {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    };
    const addMinutes = (d, mins) => {
      return new Date(d.getTime() + mins * 6e4);
    };
    const firstSession = isDual ? olderSession : newestSession;
    const secondSession = isDual ? newestSession : newestSession;
    const date1 = firstSession[6] || "";
    const time1 = firstSession[7] || "";
    const saataralik1 = time1;
    let startTime1 = parseStartTime(time1);
    let egitimsuresi;
    if (isDual) {
      const date2 = secondSession[6] || "";
      const time2 = secondSession[7] || "";
      const saataralik2 = time2;
      egitimsuresi = `${date1} ${saataralik1} /  ${date2} ${saataralik2}`;
    } else {
      const saatss = addMinutes(startTime1, 60);
      const saatss2 = addMinutes(startTime1, 110);
      const formatHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      egitimsuresi = `${date1} ${saataralik1} / ${formatHM(saatss)} - ${formatHM(saatss2)}`;
    }
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${instructorName}$2`);
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);
    let chartHtml = "";
    let currentTime = new Date(startTime1.getTime());
    let startTime2 = null;
    let date2ForChart = date1;
    if (isDual) {
      startTime2 = parseStartTime(secondSession[7] || "");
      date2ForChart = secondSession[6] || "";
    }
    let currentDate = date1;
    for (let i = 0; i < 16; i++) {
      let duration = "00:06";
      if (i === 8) {
        if (isDual && startTime2) {
          currentTime = new Date(startTime2.getTime());
          currentDate = date2ForChart;
        } else {
          currentTime = addMinutes(currentTime, 18);
        }
      }
      const rowStart = formatTime(currentTime);
      let rowEnd;
      if (i === 7 || i === 15) {
        rowEnd = formatTime(addMinutes(currentTime, 8));
        duration = "00:08";
      } else {
        rowEnd = formatTime(addMinutes(currentTime, 6));
      }
      const score = Math.floor(Math.random() * 21) + 80;
      chartHtml += `
              <tr>
                <td>${i + 1}</td>
                <td>${currentDate}</td>
                <td>${rowStart}</td>
                <td>${rowEnd}</td>
                <td>${duration}</td>
                <td>${isDual ? i + 1 : 1}</td>
                <td>${score}</td>
              </tr>`;
      if (i !== 7) {
        currentTime = addMinutes(currentTime, 6);
      }
    }
    html = html.replace(/<tbody class="cizelgetr">[\s\S]*?<\/tbody>/i, `<tbody class="cizelgetr">${chartHtml}</tbody>`);
    return html;
  }
  generateAnagrupHtml(baseTemplate, data) {
    let html = baseTemplate;
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${data.studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${data.instructorName}$2`);
    html = html.replace(/(<span[^>]*class="baslik"[^>]*>)[^<]*(<\/span>)/i, `$1${data.scenario}$2`);
    html = html.replace(/(<span[^>]*class="tarih"[^>]*>)[^<]*(<\/span>)/i, `$1${data.date1}$2`);
    html = html.replace(/(<span[^>]*class="donem"[^>]*>)[^<]*(<\/span>)/i, `$1${data.donem}$2`);
    let egitimsuresi;
    if (data.isDual) {
      egitimsuresi = `${data.date1} ${data.time1} <br> ${data.date2} ${data.time2}`;
    } else {
      egitimsuresi = `${data.date1} ${data.time1}`;
    }
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);
    html = html.replace(/(<span[^>]*class="sirketismi"[^>]*>)[^<]*/i, `$1${data.accountLabel}`);
    let puan = 100;
    html = html.replace(/class="adet"[^>]*>[^<]*/gi, (match) => {
      const r = Math.floor(Math.random() * 101);
      if (r > 85 && puan > 80) {
        puan -= 4;
        return match.replace(/>[^<]*$/, ">1");
      }
      return match.replace(/>[^<]*$/, ">0");
    });
    html = html.replace(/(<span[^>]*class="puan"[^>]*>)[^<]*(<\/span>)/i, `$1${puan}$2`);
    const weatherOptions = ["Sisli Hava", "Ya\u011Fmurlu Hava", "G\xFCne\u015Fli Hava"];
    const weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    html = html.replace(/(<span[^>]*class="havadurumu"[^>]*>)[^<]*(<\/span>)/i, `$1${weather}$2`);
    return html;
  }
  /**
   * Get list of anagrup scenarios
   */
  getAnagrupScenarios() {
    return [
      "ALGI VE REFLEKS S\u0130M\xDCLASYONU",
      "DE\u011E\u0130\u015E\u0130K HAVA KO\u015EULLARI S\u0130M\xDCLASYONU",
      "D\u0130REKS\u0130YON E\u011E\u0130T\u0130M ALANI S\u0130M\xDCLASYONU",
      "GECE, G\xDCND\xDCZ S\u0130SL\u0130 HAVA S\u0130M\xDCLASYONU",
      "\u0130N\u0130\u015E \xC7IKI\u015E E\u011E\u0130ML\u0130 YOL S\u0130M\xDCLASYONU",
      "PARK E\u011E\u0130T\u0130M\u0130 S\u0130M\xDCLASYONU",
      "\u015EEH\u0130R \u0130\xC7\u0130 YOL S\u0130M\xDCLASYONU",
      "\u015EEH\u0130RLER ARASI YOL S\u0130M\xDCLASYONU",
      "TRAF\u0130K \u0130\u015EARETLER\u0130 S\u0130M\xDCLASYONU",
      "TRAF\u0130K ORTAMI S\u0130M\xDCLASYONU",
      "V\u0130RAJLI YOLDA S\xDCR\xDC\u015E S\u0130M\xDCLASYONU"
    ];
  }
  fetchTemplate(templateName) {
    return fetchEncryptedTemplate(`direksiyon-takip/${templateName}`);
  }
  // ==================== BATCH DİREKSİYON TAKİP / SİMÜLATÖR ====================
  trackBatchError(errorMessage, studentTc) {
    if (!this.pendingBatchDownload)
      return;
    const key = errorMessage;
    const existing = this.pendingBatchDownload.errors.get(key);
    if (existing) {
      if (!existing.samples.includes(studentTc)) {
        existing.samples.push(studentTc);
      }
    } else {
      this.pendingBatchDownload.errors.set(key, { message: errorMessage, samples: [studentTc] });
    }
    const isDataNotFound = errorMessage.includes("Sim\xFClat\xF6r dersi bulunamad\u0131") || errorMessage.includes("Ders program\u0131 bulunamad\u0131");
    if (isDataNotFound) {
      this.pendingBatchDownload.notFound++;
    }
  }
  formatBatchErrorSummary() {
    if (!this.pendingBatchDownload || this.pendingBatchDownload.errors.size === 0)
      return "";
    const errorLines = [];
    for (const [message, data] of this.pendingBatchDownload.errors) {
      const sampleText = data.samples.length === 1 ? `(TC: ${data.samples[0]})` : `(${data.samples.length} \xF6\u011Frenci, \xF6rnek: ${data.samples[0]})`;
      errorLines.push(`\u2022 ${message} ${sampleText}`);
    }
    return errorLines.join("\n");
  }
  async handleBatchDireksiyon(account, parentWin) {
    this.handleBatchGeneric("direksiyon", account, parentWin);
  }
  async handleBatchGeneric(batchType, account, parentWin) {
    const labels = { direksiyon: "\xC7oklu Direksiyon Takip", simulator: "\xC7oklu Sim\xFClat\xF6r Raporu" };
    console.log(`[${account.label}] Starting batch ${batchType}...`);
    this.pendingBatchDownload = {
      batchType,
      options: { donemi: "", ogrenciDurumu: "0", onayDurumu: "4", grubu: "-1", subesi: "-1" },
      donemList: [],
      currentDonemIndex: 0,
      statusList: [],
      currentStatusIndex: 0,
      students: [],
      processedTcs: /* @__PURE__ */ new Set(),
      currentStudentIndex: 0,
      outputDir: "",
      account,
      parentWin,
      completed: 0,
      failed: 0,
      notFound: 0,
      statusMessage: "Ba\u015Flat\u0131l\u0131yor...",
      errors: /* @__PURE__ */ new Map()
    };
    try {
      this.batchStateListener?.(true);
    } catch {
    }
    const currentURL = parentWin.webContents.getURL().toLowerCase();
    if (currentURL.includes("skt02006")) {
      this.pendingDownloadPhase = "batch-skt02006-options";
      this.handleSkt02006Options(parentWin, account);
    } else if (currentURL.includes("/skt/")) {
      this.pendingDownloadPhase = "batch-skt02006-options";
      this.clickMenuItemForSkt02006(parentWin, account);
    } else {
      this.pendingDownloadPhase = "batch-skt-module";
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              td.click();
              return true;
            }
          }
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              tr.click();
              return true;
            }
          }
          return false;
        })();
      `).catch(() => false);
      if (!clicked) {
        console.log(`[${account.label}] Batch: SKT module not found`);
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
      }
    }
  }
  async clickMenuItemForSkt02006(win, account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02006')) {
            console.log('[MEBBIS] Found skt02006 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02006 menu item not found');
        return false;
      })();
    `).catch(() => false);
    if (!clicked) {
      console.log(`[${account.label}] Batch: skt02006 menu not found, trying direct navigation...`);
      await win.webContents.executeJavaScript(`
        window.location.href = '/SKT/skt02006.aspx';
      `).catch(() => {
      });
    }
  }
  async handleSkt02006Options(win, account) {
    if (!this.pendingBatchDownload)
      return;
    const batchType = this.pendingBatchDownload.batchType;
    const modalTitles = { direksiyon: "\xC7oklu Direksiyon Takip", simulator: "\xC7oklu Sim\xFClat\xF6r Raporu" };
    const modalTitle = modalTitles[batchType] || "\xC7oklu \u0130ndirme";
    try {
      const formOptions = await win.webContents.executeJavaScript(`
        (function() {
          function getSelectOptions(id) {
            const select = document.getElementById(id);
            if (!select) return [];
            return Array.from(select.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
          }
          return {
            donemi: getSelectOptions('cmbEgitimDonemi'),
            ogrenciDurumu: getSelectOptions('cmbOgrenciDurumu'),
            onayDurumu: getSelectOptions('cmbDurumu'),
            grubu: getSelectOptions('cmbGrubu'),
            subesi: getSelectOptions('cmbSubesi'),
          };
        })();
      `);
      console.log(`[${account.label}] Batch: form options scraped:`, JSON.stringify({
        donemi: formOptions.donemi?.length || 0,
        ogrenciDurumu: formOptions.ogrenciDurumu?.length || 0,
        onayDurumu: formOptions.onayDurumu?.length || 0,
        grubu: formOptions.grubu?.length || 0,
        subesi: formOptions.subesi?.length || 0
      }));
      this.pendingBatchDownload.donemList = formOptions.donemi || [];
      await win.webContents.executeJavaScript(`
        (function() {
          let overlay = document.getElementById('mebbis-batch-overlay');
          if (overlay) overlay.remove();

          overlay = document.createElement('div');
          overlay.id = 'mebbis-batch-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';

          const modal = document.createElement('div');
          modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; color: white;';

          const title = document.createElement('h3');
          title.style.cssText = 'margin: 0 0 20px 0; color: #4361ee; font-size: 18px; text-align: center;';
          title.textContent = '${modalTitle}';
          modal.appendChild(title);

          function createSelect(labelText, id, options, defaultValue) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom: 14px;';
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; font-size: 13px; color: #aaa;';
            label.textContent = labelText;
            wrap.appendChild(label);
            const select = document.createElement('select');
            select.id = id;
            select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;';
            select.onfocus = () => { select.style.borderColor = '#4361ee'; };
            select.onblur = () => { select.style.borderColor = '#2a2a4a'; };
            options.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              opt.style.cssText = 'color: white; background-color: #16213e;';
              if (o.value === defaultValue) opt.selected = true;
              select.appendChild(opt);
            });
            wrap.appendChild(select);
            return wrap;
          }

          const donemOptions = ${JSON.stringify(formOptions.donemi || [])};
          const tumDonemOpt = donemOptions.find(o => o.label.toLowerCase().includes('t\xFCm') || o.label.toLowerCase().includes('t\xFCm'));
          modal.appendChild(createSelect('E\u011Fitim D\xF6nemi', 'batch-donemi', donemOptions, tumDonemOpt?.value || donemOptions[0]?.value || ''));

          const ogrenciOptions = ${JSON.stringify(formOptions.ogrenciDurumu || [])};
          const hepsiOption = { value: 'HEPSI', label: 'Hepsi (Uygulama + Sertifika + Hak Doldu)' };
          const ogrenciOptionsWithHepsi = [hepsiOption, ...ogrenciOptions];
          modal.appendChild(createSelect('\xD6\u011Frenci Durumu', 'batch-ogrenciDurumu',
            ogrenciOptionsWithHepsi, 'HEPSI'));

          const onayDurumuOpts = ${JSON.stringify(formOptions.onayDurumu || [])};
          const tumAdaylarOpt = onayDurumuOpts.find(o => o.label.toLowerCase().includes('t\xFCm') || o.label.toLowerCase().includes('t\xFCm'));
          modal.appendChild(createSelect('Onay Durumu', 'batch-onayDurumu',
            onayDurumuOpts, tumAdaylarOpt?.value || '4'));

          modal.appendChild(createSelect('Grubu', 'batch-grubu',
            ${JSON.stringify(formOptions.grubu || [])}, '-1'));

          modal.appendChild(createSelect('\u015Eubesi', 'batch-subesi',
            ${JSON.stringify(formOptions.subesi || [])}, '-1'));

          // Simulator type selector (only for simulator batch)
          if ('${batchType}' === 'simulator') {
            modal.appendChild(createSelect('Sim\xFClasyon Tipi', 'batch-simType', [
              { value: 'sesim', label: 'Sesim (1 rapor/\xF6\u011Frenci)' },
              { value: 'ana_grup', label: 'Ana Grup (11 rapor/\xF6\u011Frenci)' },
              { value: 'both', label: 'Her \u0130kisi' },
            ], 'both'));
          }

          // Progress area (hidden initially)
          const progressArea = document.createElement('div');
          progressArea.id = 'batch-progress';
          progressArea.style.cssText = 'display: none; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
          modal.appendChild(progressArea);

          // Buttons
          const btnRow = document.createElement('div');
          btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = '\u0130ptal';
          cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          cancelBtn.onclick = () => {
            overlay.remove();
            console.log('MEBBIS_BATCH_CANCEL');
          };
          btnRow.appendChild(cancelBtn);

          const startBtn = document.createElement('button');
          startBtn.id = 'batch-start-btn';
          startBtn.textContent = 'Ba\u015Flat';
          startBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
          startBtn.onclick = () => {
            const options = {
              donemi: document.getElementById('batch-donemi').value,
              ogrenciDurumu: document.getElementById('batch-ogrenciDurumu').value,
              onayDurumu: document.getElementById('batch-onayDurumu').value,
              grubu: document.getElementById('batch-grubu').value,
              subesi: document.getElementById('batch-subesi').value,
              simType: document.getElementById('batch-simType')?.value || '',
            };
            startBtn.disabled = true;
            startBtn.textContent = 'Y\xFCkleniyor...';
            startBtn.style.opacity = '0.6';
            cancelBtn.disabled = true;
            const progress = document.getElementById('batch-progress');
            if (progress) { progress.style.display = 'block'; progress.textContent = '\xD6\u011Frenci listesi al\u0131n\u0131yor...'; }
            console.log('MEBBIS_BATCH_START:' + JSON.stringify(options));
          };
          btnRow.appendChild(startBtn);

          modal.appendChild(btnRow);
          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); console.log('MEBBIS_BATCH_CANCEL'); } };
          document.body.appendChild(overlay);
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] Batch: options scrape error:`, e);
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }
  /**
   * Scrapes filter dropdown options from a freshly loaded skt02006 page and
   * shows a modal letting the user choose dönem / öğrenci durumu / onay
   * durumu / grup / şube. Clicking "Güncelle" emits MEBBIS_STUDENT_UPDATE_START
   * with the selected values; the main process then calls
   * submitStudentUpdateForm to re-POST the form. Closing the modal emits
   * MEBBIS_STUDENT_UPDATE_CANCEL.
   *
   * Only runs for accounts present in pendingStudentUpdate; the caller is
   * expected to add the account before navigating to skt02006.
   */
  async handleStudentUpdateOptions(win, account) {
    if (!this.pendingStudentUpdate.has(account.id))
      return;
    try {
      const formOptions = await win.webContents.executeJavaScript(`
        (function() {
          function getSelectOptions(id) {
            const sel = document.getElementById(id);
            if (!sel) return [];
            return Array.from(sel.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
          }
          return {
            donemi:        getSelectOptions('cmbEgitimDonemi'),
            ogrenciDurumu: getSelectOptions('cmbOgrenciDurumu'),
            onayDurumu:    getSelectOptions('cmbDurumu'),
            grubu:         getSelectOptions('cmbGrubu'),
            subesi:        getSelectOptions('cmbSubesi'),
          };
        })();
      `);
      const json = (v) => JSON.stringify(v ?? []);
      await win.webContents.executeJavaScript(`
        (function() {
          let overlay = document.getElementById('mebbis-student-update-overlay');
          if (overlay) overlay.remove();

          overlay = document.createElement('div');
          overlay.id = 'mebbis-student-update-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';

          const modal = document.createElement('div');
          modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; color: white;';

          const title = document.createElement('h3');
          title.style.cssText = 'margin: 0 0 6px 0; color: #4361ee; font-size: 18px; text-align: center;';
          title.textContent = '\xD6\u011Frencileri G\xFCncelle';
          modal.appendChild(title);

          const sub = document.createElement('div');
          sub.style.cssText = 'text-align:center; color:#888; font-size:12px; margin-bottom:18px;';
          sub.textContent = 'Filtreyi se\xE7in; \xF6\u011Frenci listesi yerel kay\u0131t ve veritaban\u0131yla g\xFCncellenecek.';
          modal.appendChild(sub);

          function createSelect(labelText, id, options, defaultValue) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom: 14px;';
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; font-size: 13px; color: #aaa;';
            label.textContent = labelText;
            wrap.appendChild(label);
            const select = document.createElement('select');
            select.id = id;
            select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;';
            select.onfocus = () => { select.style.borderColor = '#4361ee'; };
            select.onblur  = () => { select.style.borderColor = '#2a2a4a'; };
            options.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              opt.style.cssText = 'color: white; background-color: #16213e;';
              if (o.value === defaultValue) opt.selected = true;
              select.appendChild(opt);
            });
            wrap.appendChild(select);
            return wrap;
          }

          // Prefer "T\xFCm\xFC" entries when the field offers one; otherwise fall back to the first option.
          function pickTumOr(opts, fallback) {
            const tum = opts.find(o => (o.label || '').toLowerCase().includes('t\xFCm'));
            return tum ? tum.value : (fallback ?? (opts[0] ? opts[0].value : ''));
          }

          const donemOpts   = ${json(formOptions.donemi)};
          const ogrenciOpts = ${json(formOptions.ogrenciDurumu)};
          const onayOpts    = ${json(formOptions.onayDurumu)};
          const grubuOpts   = ${json(formOptions.grubu)};
          const subesiOpts  = ${json(formOptions.subesi)};

          modal.appendChild(createSelect('E\u011Fitim D\xF6nemi',   'su-donemi',        donemOpts,   pickTumOr(donemOpts)));
          modal.appendChild(createSelect('\xD6\u011Frenci Durumu',  'su-ogrenciDurumu', ogrenciOpts, pickTumOr(ogrenciOpts)));
          modal.appendChild(createSelect('Onay Durumu',     'su-onayDurumu',    onayOpts,    pickTumOr(onayOpts)));
          modal.appendChild(createSelect('Grubu',           'su-grubu',         grubuOpts,   '-1'));
          modal.appendChild(createSelect('\u015Eubesi',          'su-subesi',        subesiOpts,  '-1'));

          const progress = document.createElement('div');
          progress.id = 'su-progress';
          progress.style.cssText = 'display: none; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
          modal.appendChild(progress);

          const btnRow = document.createElement('div');
          btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = '\u0130ptal';
          cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          cancelBtn.onclick = () => { overlay.remove(); console.log('MEBBIS_STUDENT_UPDATE_CANCEL'); };
          btnRow.appendChild(cancelBtn);

          const startBtn = document.createElement('button');
          startBtn.id = 'su-start-btn';
          startBtn.textContent = 'G\xFCncelle';
          startBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
          startBtn.onclick = () => {
            const options = {
              donemi:        document.getElementById('su-donemi').value,
              ogrenciDurumu: document.getElementById('su-ogrenciDurumu').value,
              onayDurumu:    document.getElementById('su-onayDurumu').value,
              grubu:         document.getElementById('su-grubu').value,
              subesi:        document.getElementById('su-subesi').value,
            };
            startBtn.disabled = true;
            startBtn.textContent = 'Y\xFCkleniyor...';
            startBtn.style.opacity = '0.6';
            cancelBtn.disabled = true;
            const p = document.getElementById('su-progress');
            if (p) { p.style.display = 'block'; p.textContent = '\xD6\u011Frenci listesi al\u0131n\u0131yor...'; }
            console.log('MEBBIS_STUDENT_UPDATE_START:' + JSON.stringify(options));
          };
          btnRow.appendChild(startBtn);

          modal.appendChild(btnRow);
          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); console.log('MEBBIS_STUDENT_UPDATE_CANCEL'); } };
          document.body.appendChild(overlay);
        })();
      `);
    } catch (e) {
      console.error(`[StudentUpdate][${account.label}] options scrape error:`, e);
      this.pendingStudentUpdate.delete(account.id);
    }
  }
  /**
   * Submits the skt02006 filter form for the student-update flow. The
   * resulting page load is caught by the passive skt02006 branch in the
   * page-load handler, which runs parseAndIngestStudentList (already wired
   * to push to the backend). Clears the pending flag so subsequent visits
   * behave normally.
   */
  async submitStudentUpdateForm(win, options) {
    const j = (s) => JSON.stringify(String(s ?? ""));
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          function setSelectValue(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
              sel.value = value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          setSelectValue('cmbEgitimDonemi',  ${j(options.donemi)});
          setSelectValue('cmbOgrenciDurumu', ${j(options.ogrenciDurumu)});
          setSelectValue('cmbDurumu',        ${j(options.onayDurumu)});
          setSelectValue('cmbGrubu',         ${j(options.grubu)});
          setSelectValue('cmbSubesi',        ${j(options.subesi)});

          setTimeout(() => {
            const submitBtn = document.querySelector('[name="btnListeleGrid"]') ||
                              document.querySelector('input[value="Listele"]') ||
                              document.querySelector('input[type="submit"]');
            if (submitBtn) { submitBtn.click(); }
            else if (typeof __doPostBack === 'function') { __doPostBack('btnListeleGrid', ''); }
          }, 150);
        })();
      `);
    } catch (e) {
      console.error("[StudentUpdate] submit failed:", e);
    }
    this.pendingStudentUpdate.clear();
  }
  async handleBatchStart(options, account, win) {
    if (!this.pendingBatchDownload)
      return;
    const folderResult = await import_electron5.dialog.showOpenDialog(win, {
      title: "PDF Kay\u0131t Klas\xF6r\xFC Se\xE7in",
      properties: ["openDirectory", "createDirectory"]
    });
    if (folderResult.canceled || !folderResult.filePaths[0]) {
      console.log(`[${account.label}] Batch: folder selection cancelled`);
      win.webContents.executeJavaScript(`
        (function() {
          const btn = document.getElementById('batch-start-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Ba\u015Flat'; btn.style.opacity = '1'; }
          const cancel = document.querySelector('#mebbis-batch-overlay button:first-child');
          if (cancel) cancel.disabled = false;
          const progress = document.getElementById('batch-progress');
          if (progress) progress.style.display = 'none';
        })();
      `).catch(() => {
      });
      return;
    }
    this.pendingBatchDownload.outputDir = folderResult.filePaths[0];
    this.pendingBatchDownload.options = options;
    this.pendingBatchDownload.students = [];
    this.pendingBatchDownload.processedTcs = /* @__PURE__ */ new Set();
    this.pendingBatchDownload.currentStudentIndex = 0;
    this.pendingBatchDownload.completed = 0;
    this.pendingBatchDownload.failed = 0;
    this.pendingBatchDownload.notFound = 0;
    this.pendingBatchDownload.errors = /* @__PURE__ */ new Map();
    console.log(`[${account.label}] Batch: output dir=${folderResult.filePaths[0]}, options=`, options);
    const isHepsi = options.ogrenciDurumu === "HEPSI";
    if (isHepsi) {
      this.pendingBatchDownload.statusList = [
        { value: "2", label: "Uygulama S\u0131nav A\u015Famas\u0131nda" },
        { value: "5", label: "Sertifika Almaya Hak Kazand\u0131" },
        { value: "4", label: "Uygulama S\u0131nav Hakk\u0131 Doldu" }
      ];
      this.pendingBatchDownload.currentStatusIndex = 0;
      options.ogrenciDurumu = this.pendingBatchDownload.statusList[0].value;
      this.pendingBatchDownload.options.ogrenciDurumu = options.ogrenciDurumu;
      console.log(`[${account.label}] Batch: Hepsi selected, will loop through ${this.pendingBatchDownload.statusList.length} statuses`);
    } else {
      this.pendingBatchDownload.statusList = [];
      this.pendingBatchDownload.currentStatusIndex = 0;
    }
    const selectedDonem = this.pendingBatchDownload.donemList.find((d) => d.value === options.donemi);
    const isTumDonemler = selectedDonem?.label?.toLowerCase().includes("t\xFCm") || false;
    if (isTumDonemler && this.pendingBatchDownload.donemList.length > 1) {
      const realPeriods = this.pendingBatchDownload.donemList.filter((d) => !d.label.toLowerCase().includes("t\xFCm"));
      this.pendingBatchDownload.donemList = realPeriods;
      this.pendingBatchDownload.currentDonemIndex = 0;
      if (realPeriods.length === 0) {
        this.showBatchProgress(win, "Hata: D\xF6nem listesi bo\u015F!", "#ff4444");
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
        return;
      }
      const firstDonem = realPeriods[0];
      this.showBatchProgress(win, `D\xF6nem taran\u0131yor: ${firstDonem.label} (1/${realPeriods.length})...`);
      this.pendingDownloadPhase = "batch-skt02006-results";
      this.submitSkt02006Form(win, firstDonem.value, options);
    } else {
      this.pendingBatchDownload.donemList = [];
      this.showBatchProgress(win, "\xD6\u011Frenci listesi al\u0131n\u0131yor...");
      this.pendingDownloadPhase = "batch-skt02006-results";
      this.submitSkt02006Form(win, options.donemi, options);
    }
  }
  async submitSkt02006Form(win, donemiValue, options) {
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          function setSelectValue(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
              sel.value = value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          setSelectValue('cmbEgitimDonemi', '${donemiValue}');
          setSelectValue('cmbOgrenciDurumu', '${options.ogrenciDurumu}');
          setSelectValue('cmbDurumu', '${options.onayDurumu}');
          setSelectValue('cmbGrubu', '${options.grubu}');
          setSelectValue('cmbSubesi', '${options.subesi}');

          setTimeout(() => {
            const submitBtn = document.querySelector('[name="btnListeleGrid"]') ||
                             document.querySelector('input[value="Listele"]') ||
                             document.querySelector('input[type="submit"]');
            if (submitBtn) {
              console.log('[MEBBIS] Clicking Listele button...');
              submitBtn.click();
            } else {
              console.log('[MEBBIS] Listele button not found, trying __doPostBack...');
              if (typeof __doPostBack === 'function') {
                __doPostBack('btnListeleGrid', '');
              }
            }
          }, 500);
        })();
      `);
    } catch (e) {
      console.error(`[${this.pendingBatchDownload?.account.label}] Batch: form submit error:`, e);
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }
  async handleSkt02006Results(win, account) {
    if (!this.pendingBatchDownload)
      return;
    try {
      const tableData = await win.webContents.executeJavaScript(`
        (function() {
          const table = document.querySelector('table.frmList');
          if (!table) return { students: [], error: 'Tablo bulunamad\u0131' };
          const students = [];
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // skt02006 columns: 0:S.No | 1:Sil | 2:TC | 3:Ad\u0131 Soyad\u0131
            const tc = cellTexts[2] || '';
            const name = cellTexts[3] || '';
            if (tc && /^[0-9]{11}$/.test(tc)) {
              students.push({ tc, name });
            }
          }
          return { students };
        })();
      `);
      if (tableData.error) {
        console.log(`[${account.label}] Batch: ${tableData.error}`);
      }
      const newStudents = tableData.students || [];
      console.log(`[${account.label}] Batch: found ${newStudents.length} students in this period`);
      for (const student of newStudents) {
        if (!this.pendingBatchDownload.processedTcs.has(student.tc)) {
          this.pendingBatchDownload.processedTcs.add(student.tc);
          this.pendingBatchDownload.students.push(student);
        }
      }
      if (this.pendingBatchDownload.donemList.length > 0 && this.pendingBatchDownload.currentDonemIndex < this.pendingBatchDownload.donemList.length - 1) {
        this.pendingBatchDownload.currentDonemIndex++;
        const nextDonem = this.pendingBatchDownload.donemList[this.pendingBatchDownload.currentDonemIndex];
        const total = this.pendingBatchDownload.donemList.length;
        this.showBatchProgress(win, `D\xF6nem taran\u0131yor: ${nextDonem.label} (${this.pendingBatchDownload.currentDonemIndex + 1}/${total})... Toplam: ${this.pendingBatchDownload.students.length} \xF6\u011Frenci`);
        this.pendingDownloadPhase = "batch-skt02006-results";
        this.submitSkt02006Form(win, nextDonem.value, this.pendingBatchDownload.options);
        return;
      }
      if (this.pendingBatchDownload.statusList.length > 0 && this.pendingBatchDownload.currentStatusIndex < this.pendingBatchDownload.statusList.length - 1) {
        this.pendingBatchDownload.currentStatusIndex++;
        const nextStatus = this.pendingBatchDownload.statusList[this.pendingBatchDownload.currentStatusIndex];
        const totalStatuses = this.pendingBatchDownload.statusList.length;
        this.pendingBatchDownload.currentDonemIndex = 0;
        this.pendingBatchDownload.options.ogrenciDurumu = nextStatus.value;
        console.log(`[${account.label}] Batch: moving to next status: ${nextStatus.label} (${this.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})`);
        this.showBatchProgress(win, `Durum taran\u0131yor: ${nextStatus.label} (${this.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})... Toplam: ${this.pendingBatchDownload.students.length} \xF6\u011Frenci`);
        this.pendingDownloadPhase = "batch-skt02006-results";
        if (this.pendingBatchDownload.donemList.length > 0) {
          this.submitSkt02006Form(win, this.pendingBatchDownload.donemList[0].value, this.pendingBatchDownload.options);
        } else {
          this.submitSkt02006Form(win, this.pendingBatchDownload.options.donemi, this.pendingBatchDownload.options);
        }
        return;
      }
      const totalStudents = this.pendingBatchDownload.students.length;
      if (totalStudents === 0) {
        this.showBatchProgress(win, "\xD6\u011Frenci bulunamad\u0131!", "#ff4444");
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
        return;
      }
      console.log(`[${account.label}] Batch: total unique students: ${totalStudents}, starting PDF generation...`);
      this.showBatchProgress(win, `${totalStudents} \xF6\u011Frenci bulundu. PDF olu\u015Fturuluyor... (0/${totalStudents})`);
      this.pendingBatchDownload.currentStudentIndex = 0;
      this.pendingDownloadPhase = "batch-skt02009-navigate";
      this.clickMenuItemForSkt02009(win, account);
    } catch (e) {
      console.error(`[${account.label}] Batch: results scrape error:`, e);
      this.showBatchProgress(win, "Hata: \xD6\u011Frenci listesi okunamad\u0131", "#ff4444");
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }
  async handleBatchStudentNavigate(win, account) {
    if (!this.pendingBatchDownload)
      return;
    const { students, currentStudentIndex } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length)
      return;
    const student = students[currentStudentIndex];
    console.log(`[${account.label}] Batch: filling TC for ${student.name} (${student.tc}) [${currentStudentIndex + 1}/${students.length}]`);
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${student.tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') ||
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[${account.label}] Batch: TC fill error for ${student.tc}:`, e);
      this.trackBatchError("TC giri\u015F hatas\u0131", student.tc);
      this.pendingBatchDownload.failed++;
      this.batchProcessNextStudent(win, account);
    }
  }
  async handleBatchStudentResults(win, account) {
    if (!this.pendingBatchDownload)
      return;
    const { students, currentStudentIndex, outputDir } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length)
      return;
    const student = students[currentStudentIndex];
    const total = students.length;
    const selectedDonemiValue = this.pendingBatchDownload.options?.donemi ?? "";
    const selectedDonemiLabelRaw = this.pendingBatchDownload.donemList?.find((d) => d.value === selectedDonemiValue)?.label ?? "";
    const isAllPeriods = /tüm|tüm/i.test(selectedDonemiLabelRaw);
    const targetPeriodLabel = isAllPeriods ? "" : selectedDonemiLabelRaw;
    const targetPeriodJs = JSON.stringify(targetPeriodLabel);
    try {
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          ${PERIOD_HELPERS_JS}
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${student.tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${student.tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Ders program\u0131 bulunamad\u0131', studentInfo };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Ba\u015Far\u0131s\u0131z Aday')) continue;
            lessons.push(cellTexts);
          }
          // Match the period the user picked in the batch dialog (e.g. May).
          // If they picked "T\xFCm D\xF6nemler" or the student doesn't have that
          // period, fall back to the chronologically newest period.
          const filteredLessons = _filterByPeriod(lessons, ${targetPeriodJs});
          return { studentInfo, lessons: filteredLessons };
        })();
      `);
      if (lessonData.error) {
        console.log(`[${account.label}] Batch: ${student.tc} - ${lessonData.error}`);
        this.trackBatchError(lessonData.error, student.tc);
        this.pendingBatchDownload.failed++;
      } else {
        await this.batchGenerateForStudent(lessonData, student, account);
      }
    } catch (e) {
      const err = e;
      const errorMsg = err?.message || String(e);
      const detail = err?.detail || "";
      console.error(`[${account.label}] Batch: PDF error for ${student.tc}: ${errorMsg}${detail ? " (" + detail + ")" : ""}`, e);
      this.trackBatchError(errorMsg, student.tc);
      this.pendingBatchDownload.failed++;
    }
    const completed = this.pendingBatchDownload.completed;
    const failed = this.pendingBatchDownload.failed;
    const processed = completed + failed;
    this.showBatchProgress(win, `PDF olu\u015Fturuluyor... (${processed}/${total}) - Ba\u015Far\u0131l\u0131: ${completed}${failed > 0 ? ", Hatal\u0131: " + failed : ""}`);
    this.batchProcessNextStudent(win, account);
  }
  async batchGenerateForStudent(lessonData, student, account) {
    if (!this.pendingBatchDownload)
      return;
    const { batchType, outputDir } = this.pendingBatchDownload;
    const studentName = (lessonData.studentInfo["ad-soyad"] || student.name || "unknown").replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, "").replace(/\s+/g, "_");
    if (batchType === "direksiyon") {
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons);
      const filename = `direksiyon_${student.tc}_${studentName}.pdf`;
      fs5.writeFileSync(path5.join(outputDir, filename), pdfBuffer);
      console.log(`[${account.label}] Batch: saved ${filename}`);
      this.pendingBatchDownload.completed++;
      this.logPdf(account, "direksiyon_takip", 1);
    } else if (batchType === "simulator") {
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
      if (simulatorSessions.length === 0) {
        console.log(`[${account.label}] Batch: ${student.tc} - Sim\xFClat\xF6r dersi bulunamad\u0131`);
        this.trackBatchError("Sim\xFClat\xF6r dersi bulunamad\u0131", student.tc);
        this.pendingBatchDownload.failed++;
        return;
      }
      simulatorSessions.sort((a, b) => {
        const dateA = (a[6] || "").split("/").reverse().join("-");
        const dateB = (b[6] || "").split("/").reverse().join("-");
        if (dateA !== dateB)
          return dateB.localeCompare(dateA);
        const timeA = (a[7] || "").split("-")[0].trim();
        const timeB = (b[7] || "").split("-")[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);
      const simType = this.pendingBatchDownload.options.simType || "both";
      const record = simulatorSessions[0];
      const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
      const donem = record?.[0] || "bilinmeyen";
      const safeDonem = donem.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s\-]/g, "").replace(/\s+/g, "-").trim();
      const periodDir = path5.join(outputDir, safeDonem);
      const studentDir = path5.join(periodDir, `${student.tc}_${studentName}`);
      if (!fs5.existsSync(studentDir))
        fs5.mkdirSync(studentDir, { recursive: true });
      if (simType === "sesim" || simType === "both") {
        const sesimHtml = await this.generateSesimHtml(lessonData.studentInfo, simulatorSessions, account.label);
        const sesimPdf = await this.generatePdfFromHtml(sesimHtml);
        fs5.writeFileSync(path5.join(studentDir, "sesim.pdf"), sesimPdf);
      }
      if (simType === "ana_grup" || simType === "both") {
        const scenarios = this.getAnagrupScenarios();
        const baseTemplate = await this.fetchSimulatorTemplate("anagrup/anagrup.html");
        for (let i = 0; i < scenarios.length; i++) {
          const html = this.generateAnagrupHtml(baseTemplate, {
            studentName: lessonData.studentInfo["ad-soyad"],
            instructorName: record?.[8] || "Bilinmeyen",
            date1: record?.[6] || "",
            time1: record?.[7] || "",
            date2: recordo?.[6] || "",
            time2: recordo?.[7] || "",
            donem,
            scenario: scenarios[i],
            accountLabel: account.label,
            isDual: recordo !== null
          });
          const pdf = await this.generatePdfFromHtml(html);
          const safeName = scenarios[i].replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, "").trim();
          fs5.writeFileSync(path5.join(studentDir, `${i + 1}_${safeName}.pdf`), pdf);
        }
      }
      const ek4Html = await this.generateEk4Html(
        lessonData.studentInfo["ad-soyad"],
        record?.[4] || "",
        // plaka
        record?.[8] || "",
        // egitmen
        account.label,
        record?.[6] || ""
        // tarih
      );
      const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
      fs5.writeFileSync(path5.join(studentDir, "ek4.pdf"), ek4Pdf);
      console.log(`[${account.label}] Batch: simulator + ek4 saved for ${student.tc} in ${safeDonem}`);
      this.pendingBatchDownload.completed++;
      this.logPdf(account, "simulator_raporu", 1);
    }
  }
  async generateEk4Html(studentName, plateNumber, instructorName, companyName, examDate) {
    const templateContent = await this.fetchSimulatorTemplate("ek4/ek4.html");
    let html = templateContent;
    const fillByClass = (className, value) => {
      const re = new RegExp(`(<([a-z][a-z0-9]*)\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</\\2>)`, "i");
      html = html.replace(re, `$1${value}$4`);
    };
    fillByClass("kursiyer", studentName);
    fillByClass("plakano", plateNumber);
    fillByClass("egitmen", instructorName);
    fillByClass("companyName", companyName.toUpperCase());
    fillByClass("tarih", examDate);
    html = html.replace(/class="sep sep(\d+)(?!\s*hidden)([^"]*)"/g, (_m, num, rest) => {
      return `class="sep sep${num}${rest} hidden"`.replace(/\s+/g, " ");
    });
    const groups = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["10", "11", "12", "13"]
    ];
    const selectedGroup = groups[Math.floor(Math.random() * groups.length)];
    for (const num of selectedGroup) {
      const re = new RegExp(`class="sep sep${num}([^"]*)\\s+hidden([^"]*)"`, "g");
      html = html.replace(re, (_m, before, after) => `class="sep sep${num}${(before + after).replace(/\s+/g, " ").trimEnd()}"`);
    }
    return html;
  }
  async batchProcessNextStudent(win, account) {
    if (!this.pendingBatchDownload)
      return;
    this.pendingBatchDownload.currentStudentIndex++;
    const { students, currentStudentIndex } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length) {
      const { completed, failed, notFound, outputDir, batchType } = this.pendingBatchDownload;
      const actualErrors = failed - notFound;
      const titles = { direksiyon: "\xC7oklu Direksiyon Takip", simulator: "\xC7oklu Sim\xFClat\xF6r Raporu" };
      let statusMsg = `Tamamland\u0131! ${completed} PDF olu\u015Fturuldu`;
      if (notFound > 0)
        statusMsg += `, ${notFound} bulunamad\u0131`;
      if (actualErrors > 0)
        statusMsg += `, ${actualErrors} hatal\u0131`;
      console.log(`[${account.label}] Batch ${batchType}: completed! ${completed} success, ${notFound} not found, ${actualErrors} errors`);
      this.showBatchProgress(win, statusMsg, "#00cc66");
      const errorSummary = this.formatBatchErrorSummary();
      const dialogMsg = `${completed} PDF olu\u015Fturuldu${notFound > 0 ? ", " + notFound + " bulunamad\u0131" : ""}${actualErrors > 0 ? ", " + actualErrors + " hatal\u0131" : ""}.`;
      const detailText = errorSummary ? `Klas\xF6r: ${outputDir}

Hatalar:
${errorSummary}` : `Klas\xF6r: ${outputDir}`;
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
      setTimeout(() => {
        this.hideBatchStatus(win);
      }, 8e3);
      import_electron5.dialog.showMessageBox(win, {
        type: "info",
        title: titles[batchType] || "\xC7oklu \u0130ndirme",
        message: dialogMsg,
        detail: detailText,
        buttons: ["Tamam"]
      }).catch(() => {
      });
      return;
    }
    this.pendingDownloadPhase = "batch-skt02009-navigate";
    await win.webContents.executeJavaScript(`
      window.location.href = window.location.pathname;
    `).catch(() => {
    });
  }
  showBatchProgress(win, message, color) {
    if (this.pendingBatchDownload) {
      this.pendingBatchDownload.statusMessage = message;
    }
    const safeMsg = message.replace(/'/g, "\\'").replace(/\n/g, " ");
    const bgColor = color || "#4361ee";
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          let bar = document.getElementById('mebbis-batch-status-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'mebbis-batch-status-bar';
            document.body.appendChild(bar);
          }
          bar.style.cssText = 'position: fixed; top: 0; left: 200px; right: 0; z-index: 999999; background: #1a1a2e; color: ${bgColor}; padding: 10px 20px; font-size: 13px; font-weight: bold; text-align: center; font-family: Arial, sans-serif; border-bottom: 2px solid ${bgColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.4);';
          bar.textContent = '${safeMsg}';
          // Also update modal progress if it exists
          const progress = document.getElementById('batch-progress');
          if (progress) {
            progress.style.display = 'block';
            progress.style.cssText = 'display: block; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: ${bgColor}; font-size: 13px; text-align: center;';
            progress.textContent = '${safeMsg}';
          }
        })();
      `).catch(() => {
      });
    }
  }
  hideBatchStatus(win) {
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          const bar = document.getElementById('mebbis-batch-status-bar');
          if (bar) bar.remove();
        })();
      `).catch(() => {
      });
    }
  }
  reinjectBatchStatus(win) {
    if (this.pendingBatchDownload && this.pendingBatchDownload.statusMessage) {
      this.showBatchProgress(win, this.pendingBatchDownload.statusMessage);
    }
  }
  // ==================== END BATCH DİREKSİYON / SİMÜLATÖR ====================
  stopAll() {
    console.log("Stopping all accounts and flushing cookies...");
    for (const [id] of this.running) {
      const partition = `persist:mebbis-${id}`;
      const ses = import_electron5.session.fromPartition(partition);
      ses.cookies.flushStore().catch(() => {
      });
      this.stop(id);
    }
  }
  // ==================== DEV TEST HELPERS ====================
  /**
   * Generate a Direksiyon Takip PDF with entirely fake/test data.
   * Asks the user where to save and then opens the file.
   * Only called from the dev test panel (main process gates it with IS_DEV).
   */
  async generateTestDireksiyonPdf(sinif, mainWindow) {
    const fakeStudentInfo = {
      "ad-soyad": "TEST ADAY AHMET YILMAZ",
      "tc-kimlik-no": "12345678901",
      "istenen-sertifika": "B SINIFI SERT\u0130F\u0130KA (Manuel)"
    };
    const fakeLessons = [];
    const plates = ["34 TEST 001", "34 TEST 002", "34 TEST 003"];
    const dates = [
      "05.02.2025",
      "12.02.2025",
      "19.02.2025",
      "26.02.2025",
      "05.03.2025",
      "12.03.2025",
      "19.03.2025",
      "26.03.2025",
      "02.04.2025",
      "09.04.2025",
      "16.04.2025",
      "23.04.2025",
      "30.04.2025",
      "07.05.2025",
      "14.05.2025",
      "21.05.2025",
      "28.05.2025",
      "04.06.2025",
      "11.06.2025",
      "18.06.2025"
    ];
    const times = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "14:00 - 15:00"];
    const instructor = "TEST E\u011E\u0130TMEN AL\u0130 DEM\u0130R";
    const noSimForce = sinif.endsWith("-nosim");
    const sinifClean = noSimForce ? sinif.slice(0, -"-nosim".length) : sinif;
    let lessonCount = 16;
    const sinifParts = sinifClean.split("|");
    if (sinifParts.length === 2) {
      const n = parseInt(sinifParts[1], 10);
      if (!isNaN(n) && n > 0)
        lessonCount = n;
    }
    const isYeni = sinifClean.startsWith("0,");
    const needsSimulator = !noSimForce && isYeni && (lessonCount === 14 || lessonCount === 16);
    let simulatorInserted = false;
    for (let i = 0; i < lessonCount; i++) {
      const isSimRow = needsSimulator && !simulatorInserted && i === Math.floor(lessonCount / 2);
      if (isSimRow)
        simulatorInserted = true;
      const row = new Array(10).fill("");
      row[0] = "2025/1. D\xD6NEM";
      row[4] = isSimRow ? "34 TEST SIM" : plates[i % plates.length];
      row[5] = isSimRow ? "Simulat\xF6r" : "Trafik";
      row[6] = dates[i % dates.length];
      row[7] = times[i % times.length];
      row[8] = instructor;
      fakeLessons.push(row);
    }
    const saveResult = await import_electron5.dialog.showSaveDialog(mainWindow, {
      title: "Test Direksiyon Takip PDF \u2014 Kaydet",
      defaultPath: `test_direksiyon_takip_${sinif.replace(/[|,]/g, "_")}.pdf`,
      filters: [{ name: "PDF Dosyas\u0131", extensions: ["pdf"] }]
    });
    if (saveResult.canceled || !saveResult.filePath)
      return;
    console.log("[DEV TEST] Generating Direksiyon Takip PDF with fake data, sinif:", sinif);
    const pdfBuffer = await this.generatePdfFromTemplate(fakeStudentInfo, fakeLessons, sinifClean);
    fs5.writeFileSync(saveResult.filePath, pdfBuffer);
    console.log("[DEV TEST] Saved to:", saveResult.filePath);
    await import_electron5.shell.openPath(saveResult.filePath);
  }
  /**
   * Generate a K-Belgesi preview window from user-supplied form data,
   * then allow the user to print or cancel.
   */
  async generateKBelgesiPdf(data, parentWin) {
    let html;
    try {
      html = await fetchEncryptedTemplate("k-belgesi/k-belgesi.html");
    } catch (e) {
      console.error("[K-Belgesi] Failed to fetch template:", e?.message ?? e);
      return;
    }
    const previewChrome = `<style id="kb-preview-chrome">
  @media screen {
    body { background: #e5e7eb !important; }
    #kb-toolbar { position: fixed; top: 12px; right: 12px; background: #1f2937; color: white; padding: 8px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; }
    #kb-toolbar .label { margin-right: 6px; opacity: 0.85; }
    #kb-toolbar button { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; }
    #kb-cancel { border: 1px solid #6b7280; background: transparent; color: white; }
    #kb-cancel:hover { background: rgba(255,255,255,0.08); }
    #kb-print { border: none; background: #3b82f6; color: white; font-weight: 600; }
    #kb-print:hover { background: #2563eb; }
  }
  @media print { #kb-toolbar { display: none !important; } }
</style>
<div id="kb-toolbar">
  <span class="label">A4 \xB7 100% \xB7 kenarl\u0131ks\u0131z</span>
  <button id="kb-cancel">\u0130ptal</button>
  <button id="kb-print">Yazd\u0131r</button>
</div>
<script>(function(){
  var data = ${JSON.stringify(data)};
  Object.keys(data).forEach(function(k){
    var el = document.querySelector('.cvp.' + k);
    if (el) el.textContent = data[k];
  });
  document.getElementById('kb-cancel').onclick = function(){ document.title = 'KB_CLOSE'; };
  document.getElementById('kb-print').onclick = function(){ document.title = 'KB_PRINT'; };
})();</script>`;
    const mergedHtml = html.replace("</body>", previewChrome + "</body>");
    const previewWin = new import_electron5.BrowserWindow({
      parent: parentWin,
      width: 900,
      height: 1180,
      title: "K Belgesi \u2014 \xD6nizleme",
      autoHideMenuBar: true,
      webPreferences: { sandbox: false, contextIsolation: false }
    });
    await previewWin.loadURL("about:blank");
    await previewWin.webContents.executeJavaScript(
      `document.open(); document.write(${JSON.stringify(mergedHtml)}); document.close();`
    );
    let printing = false;
    previewWin.webContents.on("page-title-updated", (_event, title) => {
      if (previewWin.isDestroyed())
        return;
      if (title === "KB_PRINT" && !printing) {
        printing = true;
        previewWin.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: { marginType: "none" },
            pageSize: "A4",
            scaleFactor: 100
          },
          (success, failureReason) => {
            if (!success)
              console.warn("[K-Belgesi] Print failed:", failureReason);
            if (!previewWin.isDestroyed())
              previewWin.close();
          }
        );
      } else if (title === "KB_CLOSE") {
        previewWin.close();
      }
    });
  }
  /**
   * Open a K-Sınıfı Sürücü Aday Belgesi preview window with random fake data,
   * then send it directly to the printer with locked settings (A4, marginType
   * 'none', 100% scale, printBackground). Bypassing the "Save as PDF → reopen
   * → print" round-trip removes the pixel drift caused by user-side print
   * dialog overrides (Fit to page, custom margins, etc.).
   *
   * The toolbar is injected directly into the K-Belgesi document (no iframe
   * wrapper). The template's own @page + html/body sizing (210×297mm,
   * overflow:hidden) guarantees the print is exactly one A4 page — wrapping
   * it in an iframe added a few pixels of body overflow that pushed Chromium
   * onto a blank second page.
   */
  async generateTestKBelgesiPdf(mainWindow, withBackground = false) {
    const html = await fetchEncryptedTemplate("k-belgesi/k-belgesi.html");
    const pickAdiPool = ["AHMET", "MEHMET", "AL\u0130", "AY\u015EE", "FATMA", "ZEYNEP", "MUSTAFA", "EMRE", "EL\u0130F", "CAN"];
    const pickSoyadPool = ["YILMAZ", "KAYA", "DEM\u0130R", "\xC7EL\u0130K", "\u015EAH\u0130N", "\xD6ZT\xDCRK", "AYDIN", "ARSLAN", "DO\u011EAN", "KILI\xC7"];
    const pickIlPool = ["Ankara", "\u0130stanbul", "\u0130zmir", "Bursa", "Konya", "Antalya", "Eski\u015Fehir", "Adana"];
    const pickIlce = {
      "Ankara": "\xC7ankaya",
      "\u0130stanbul": "Kad\u0131k\xF6y",
      "\u0130zmir": "Bornova",
      "Bursa": "Nil\xFCfer",
      "Konya": "Sel\xE7uklu",
      "Antalya": "Muratpa\u015Fa",
      "Eski\u015Fehir": "Tepeba\u015F\u0131",
      "Adana": "Seyhan"
    };
    const rand = (a) => a[Math.floor(Math.random() * a.length)];
    const randomTc = () => "1" + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
    const today = /* @__PURE__ */ new Date();
    const fmtDate = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const fmtDateSpaced = (d) => `${String(d.getDate()).padStart(2, "0")}    ${String(d.getMonth() + 1).padStart(2, "0")}    ${d.getFullYear()}`;
    const addMonths = (d, n) => {
      const c = new Date(d);
      c.setMonth(c.getMonth() + n);
      return c;
    };
    const adayIl = rand(pickIlPool);
    const ustaIl = rand(pickIlPool);
    const dogumYear = 1990 + Math.floor(Math.random() * 16);
    const dogumDate = new Date(dogumYear, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
    const sample = {
      // Box 1
      aracCinsi: "Otomobil",
      gurzergah: "Mahalle i\xE7i - \u015Eehir merkezi",
      gunSaat: "Pzt-Cu 09:00-17:00",
      // These two land on printed "... / ... / ......" dot groups in Box 1, so
      // use the spaced format to spread digits across the dot positions.
      duzenlenmeTarihi: fmtDateSpaced(today),
      gecerlikBitisi: fmtDateSpaced(addMonths(today, 6)),
      mudurAd: rand(pickAdiPool) + " " + rand(pickSoyadPool),
      // Box 2 — iliIlcesi fills the blank line above "İli / İlçesi Özel";
      // kursAdi only fills the dots between "Özel" and "Motorlu" (those
      // words and the rest of the title are pre-printed on the form).
      iliIlcesi: `${adayIl.toUpperCase()} / ${pickIlce[adayIl] || "Merkez"}`,
      kursAdi: "TEST",
      belgeNo: "2026-" + String(Math.floor(Math.random() * 999) + 1).padStart(3, "0"),
      belgeTarihi: fmtDate(today),
      kursAdresi: "Test Mah. Test Sok. No:" + (Math.floor(Math.random() * 99) + 1) + " " + adayIl,
      // Box 3 — sürücü adayı
      adayTc: randomTc(),
      adayAd: rand(pickAdiPool),
      adaySoyad: rand(pickSoyadPool),
      adayBabaAd: rand(pickAdiPool),
      adayDogumYeri: adayIl,
      adayDogumTarihi: fmtDate(dogumDate),
      adayAdresi: `Aday Mah. No:${Math.floor(Math.random() * 99) + 1} ${pickIlce[adayIl] || "Merkez"}/${adayIl}`,
      // Box 4 — usta öğretici
      ustaTc: randomTc(),
      ustaAd: rand(pickAdiPool),
      ustaSoyad: rand(pickSoyadPool),
      ustaAdresi: `E\u011Fitmen Mah. No:${Math.floor(Math.random() * 99) + 1} ${ustaIl}`,
      ustaBelgeSinifi: rand(["B", "C", "D", "CE"]),
      ustaBelgeNo: Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join(""),
      ustaBelgeYeri: ustaIl
    };
    const previewChrome = `<style id="kb-preview-chrome">
  @media screen {
    body { background: #e5e7eb !important; }
    #kb-toolbar { position: fixed; top: 12px; right: 12px; background: #1f2937; color: white; padding: 8px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; }
    #kb-toolbar .label { margin-right: 6px; opacity: 0.85; }
    #kb-toolbar button { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; }
    #kb-cancel { border: 1px solid #6b7280; background: transparent; color: white; }
    #kb-cancel:hover { background: rgba(255,255,255,0.08); }
    #kb-print { border: none; background: #3b82f6; color: white; font-weight: 600; }
    #kb-print:hover { background: #2563eb; }
  }
  @media print { #kb-toolbar { display: none !important; } }
</style>
<div id="kb-toolbar">
  <span class="label">A4 \xB7 100% \xB7 kenarl\u0131ks\u0131z</span>
  <button id="kb-cancel">\u0130ptal</button>
  <button id="kb-print">Yazd\u0131r</button>
</div>
<script>(function(){
  var data = ${JSON.stringify(sample)};
  Object.keys(data).forEach(function(k){
    var el = document.querySelector('.cvp.' + k);
    if (el) el.textContent = data[k];
  });
  ${withBackground ? `
  var s = document.createElement('style');
  s.textContent = '@media print { .bg { display: block !important; } }';
  document.head.appendChild(s);
  ` : ""}
  document.getElementById('kb-cancel').onclick = function(){ document.title = 'KB_CLOSE'; };
  document.getElementById('kb-print').onclick = function(){ document.title = 'KB_PRINT'; };
})();</script>`;
    const mergedHtml = html.replace("</body>", previewChrome + "</body>");
    console.log("[DEV TEST] Opening K Belgesi preview, aday:", sample.adayAd, sample.adaySoyad);
    const previewWin = new import_electron5.BrowserWindow({
      parent: mainWindow,
      width: 900,
      height: 1180,
      title: "K Belgesi \u2014 \xD6nizleme",
      autoHideMenuBar: true,
      webPreferences: { sandbox: false, contextIsolation: false }
    });
    await previewWin.loadURL("about:blank");
    await previewWin.webContents.executeJavaScript(
      `document.open(); document.write(${JSON.stringify(mergedHtml)}); document.close();`
    );
    let printing = false;
    previewWin.webContents.on("page-title-updated", (_event, title) => {
      if (previewWin.isDestroyed())
        return;
      if (title === "KB_PRINT" && !printing) {
        printing = true;
        previewWin.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: { marginType: "none" },
            pageSize: "A4",
            scaleFactor: 100
          },
          (success, failureReason) => {
            if (!success) {
              console.warn("[DEV TEST] K Belgesi print:", failureReason);
            }
            if (!previewWin.isDestroyed())
              previewWin.close();
          }
        );
      } else if (title === "KB_CLOSE") {
        previewWin.close();
      }
    });
  }
  /**
   * Generate Simulator Report PDFs with entirely fake/test data.
   * Delegates to the existing generateSimulatorReportPdf with a fake account object.
   * Only called from the dev test panel (main process gates it with IS_DEV).
   */
  async generateTestSimulatorPdf(simType, mainWindow) {
    const fakeStudentInfo = {
      "ad-soyad": "TEST ADAY AHMET YILMAZ",
      "tc-kimlik-no": "12345678901",
      "istenen-sertifika": "B SINIFI SERT\u0130F\u0130KA (Manuel)"
    };
    const fakeSimulatorSessions = [
      ["2025/1. D\xD6NEM", "", "", "", "34 TEST SIM", "Simulat\xF6r", "15.03.2025", "10:00 - 11:00", "TEST E\u011E\u0130TMEN AL\u0130 DEM\u0130R", ""],
      ["2025/1. D\xD6NEM", "", "", "", "34 TEST SIM", "Simulat\xF6r", "22.03.2025", "14:00 - 15:00", "TEST E\u011E\u0130TMEN AL\u0130 DEM\u0130R", ""]
    ];
    const fakeAccount = {
      id: "dev-test",
      username: "test_mebbis_user",
      password: "test_password",
      label: "TEST OKUL",
      isRunning: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      simulatorType: "sesim",
      subscriptionActive: true
    };
    console.log("[DEV TEST] Generating Simulator Report PDF(s) with fake data, simType:", simType);
    const outputDir = await this.generateSimulatorReportPdf(
      fakeStudentInfo,
      fakeSimulatorSessions,
      simType,
      fakeAccount,
      mainWindow
    );
    console.log("[DEV TEST] Simulator PDFs saved to:", outputDir);
    await import_electron5.shell.openPath(outputDir);
  }
};

// src/main/app-controller.ts
init_api_client();

// src/main/bundle-whats-new.ts
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var https2 = __toESM(require("https"));
var http2 = __toESM(require("http"));
var import_url = require("url");
var import_electron6 = require("electron");
var import_config3 = require("bootstrap:config");
var BUNDLE_STATE_FILE = "bundle-whats-new-dismissed.txt";
var LAUNCHER_STATE_FILE = "last-seen-code-version.txt";
function suppressLauncherWhatsNew(currentVersion) {
  try {
    fs6.writeFileSync(
      path6.join(import_electron6.app.getPath("userData"), LAUNCHER_STATE_FILE),
      currentVersion,
      "utf-8"
    );
  } catch {
  }
}
function readBundleDismissed() {
  try {
    return fs6.readFileSync(path6.join(import_electron6.app.getPath("userData"), BUNDLE_STATE_FILE), "utf-8").trim();
  } catch {
    return "";
  }
}
function writeBundleDismissed(version) {
  try {
    fs6.writeFileSync(
      path6.join(import_electron6.app.getPath("userData"), BUNDLE_STATE_FILE),
      version,
      "utf-8"
    );
  } catch {
  }
}
function fetchVersionWithHistory(timeoutMs = 5e3) {
  return new Promise((resolve, reject) => {
    const u = new import_url.URL(`${import_config3.DESKTOP_CODE_BASE_URL}/version`);
    const client = u.protocol === "https:" ? https2 : http2;
    const req = client.request(
      {
        method: "GET",
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        headers: { Accept: "application/json" },
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
            if (typeof data?.version !== "string") {
              reject(new Error('Missing "version" field'));
              return;
            }
            const out = { version: data.version };
            if (typeof data.whatsNew === "string" && data.whatsNew.trim()) {
              out.whatsNew = data.whatsNew;
            }
            if (Array.isArray(data.history)) {
              out.history = data.history.filter(
                (h) => h && typeof h.version === "string" && typeof h.whatsNew === "string"
              ).map((h) => ({ version: h.version, whatsNew: h.whatsNew }));
            }
            resolve(out);
          } catch (err) {
            reject(new Error(`Invalid JSON: ${err.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}
function suppressLauncherWhatsNewIfPossible(currentVersion) {
  if (!currentVersion)
    return;
  suppressLauncherWhatsNew(currentVersion);
}
async function showBundleWhatsNew(win, force = false) {
  if (!win || win.isDestroyed())
    return;
  let versionData;
  try {
    versionData = await fetchVersionWithHistory();
  } catch (err) {
    console.warn(`[BundleWhatsNew] Fetch failed: ${err?.message ?? err}`);
    return;
  }
  if (!versionData.whatsNew)
    return;
  if (!force && readBundleDismissed() === versionData.version)
    return;
  if (win.isDestroyed())
    return;
  const entries = [
    { version: versionData.version, whatsNew: versionData.whatsNew }
  ];
  if (Array.isArray(versionData.history)) {
    for (const h of versionData.history) {
      if (entries.length >= 4)
        break;
      if (h.version === versionData.version)
        continue;
      entries.push({ version: h.version, whatsNew: h.whatsNew });
    }
  }
  const detail = entries.map((e) => `v${e.version}
${e.whatsNew}`).join("\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n");
  let result;
  try {
    result = await import_electron6.dialog.showMessageBox(win, {
      type: "info",
      title: `Yenilikler \u2014 v${versionData.version}`,
      message: "Uygulama g\xFCncellendi",
      detail,
      buttons: ["Tamam"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      checkboxLabel: "Bir daha g\xF6sterme",
      checkboxChecked: false
    });
  } catch (err) {
    console.warn(`[BundleWhatsNew] Dialog failed: ${err?.message ?? err}`);
    return;
  }
  if (result.checkboxChecked) {
    writeBundleDismissed(versionData.version);
    console.log(
      `[BundleWhatsNew] User dismissed what's new for v${versionData.version}.`
    );
  }
}

// src/main/app-controller.ts
async function start(ctx) {
  const authStore = new AuthStore();
  const mebbisManager = new MebbisManager();
  mebbisManager.setBatchStateListener((inProgress) => {
    if (inProgress) {
      ctx.codeLoader.stopVersionPolling();
      console.log("[BatchPause] Version polling paused while batch is running.");
    } else {
      const findWindow = () => mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
      ctx.codeLoader.startVersionPolling(findWindow);
      console.log("[BatchPause] Batch ended \u2014 version polling resumed.");
    }
  });
  configureStudentSync(() => authStore.getToken(), () => null);
  configurePersonnelSync(() => authStore.getToken());
  configureKurumInfoSync(() => authStore.getToken());
  configureCarSync(() => authStore.getToken());
  if (authStore.getToken()) {
    pullAll().catch((e) => console.error("[StudentSync] Boot pull failed:", e));
  }
  let mainWindow = null;
  let isShiftHeld = false;
  function dbToAccount(m) {
    return {
      id: String(m.id),
      username: m.username ?? "",
      password: m.password ?? "",
      label: m.label,
      ownerEmail: m.ownerEmail ?? null,
      isRunning: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      simulatorType: m.simulatorType || void 0,
      subscriptionActive: m.subscriptionActive,
      subscription: m.subscription
    };
  }
  function logActivity(body) {
    const token = authStore.getToken();
    if (!token)
      return;
    apiClient.logActivity(token, body).catch(() => {
    });
  }
  function createMainWindow() {
    const win = new import_electron7.BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      title: "MEBBIS Account Manager",
      webPreferences: {
        preload: ctx.preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    win.loadURL(ctx.rendererIndexUrl);
    win.on("closed", () => {
      if (mainWindow === win)
        mainWindow = null;
    });
    return win;
  }
  function rebuildAppMenu() {
    const items = [
      {
        label: "Yard\u0131m",
        submenu: [
          { label: "Hakk\u0131nda", click: showAboutDialog },
          {
            label: "Yeni \xF6zellikler",
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                showBundleWhatsNew(mainWindow, true).catch(() => {
                });
              }
            }
          }
        ]
      }
    ];
    if (isShiftHeld) {
      items.push({
        label: "\u{1F9EA} Test",
        submenu: [
          { label: "Direksiyon Takip PDF\u2026", click: showDireksiyonPdfDialog },
          { label: "Sim\xFClasyon Raporu PDF\u2026", click: showSimulatorPdfDialog },
          { label: "K Belgesi PDF (rastgele)\u2026", click: showKBelgesiPdfDialog },
          { type: "separator" },
          { label: "\u{1F465} \xD6\u011Frenciler (\xF6rnek)", click: () => showFakeListDialog("students") },
          { label: "\u{1F697} Ara\xE7lar (\xF6rnek)", click: () => showFakeListDialog("cars") }
        ]
      });
    }
    import_electron7.Menu.setApplicationMenu(import_electron7.Menu.buildFromTemplate(items));
  }
  async function showAboutDialog() {
    if (!mainWindow || mainWindow.isDestroyed())
      return;
    const installedVer = ctx.appVersion;
    let remoteVer = "";
    try {
      await ctx.codeLoader.sync({ force: true });
      const fresh = ctx.codeLoader.getVersion();
      remoteVer = fresh ? `v${fresh}` : "(yok)";
    } catch {
      remoteVer = "hata";
    }
    let statusLine = "";
    try {
      const result = await ctx.fetchVersionCheck(installedVer);
      statusLine = result.allowed ? "\u2713 G\xFCncel" : `\u2717 Engellendi`;
    } catch {
      statusLine = "\u2717 Sunucuya ula\u015F\u0131lamad\u0131";
    }
    const aboutWin = new import_electron7.BrowserWindow({
      width: 400,
      height: 440,
      resizable: false,
      minimizable: false,
      maximizable: false,
      frame: false,
      alwaysOnTop: true,
      center: true,
      parent: mainWindow,
      modal: true,
      show: false,
      backgroundColor: "#1a1a2e",
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false }
    });
    const WHATSAPP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
    const APP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4361ee" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#1a1a2e;color:#e9e9f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;height:100vh;user-select:none;-webkit-user-select:none}
      .drag{-webkit-app-region:drag;background:#12122a;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
      .drag-title{font-size:13px;color:#8888aa;font-weight:500}
      .close-btn{-webkit-app-region:no-drag;background:none;border:none;color:#8888aa;font-size:18px;cursor:pointer;padding:0 4px;line-height:1}
      .close-btn:hover{color:#fff}
      .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 32px;gap:6px}
      .app-name{font-size:22px;font-weight:700;color:#4361ee;margin-bottom:2px}
      .tagline{font-size:12px;color:#6b6b8a;margin-bottom:16px}
      .info-box{background:#12122a;border-radius:10px;padding:14px 20px;width:100%;font-size:12px;color:#b9b9d1;line-height:1.9}
      .info-row{display:flex;justify-content:space-between}
      .info-label{color:#6b6b8a}
      .info-val{color:#e9e9f5;font-weight:500}
      .divider{height:1px;background:#2a2a4a;margin:10px 0}
      .btns{display:flex;gap:10px;width:100%;margin-top:16px}
      .btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0;border-radius:8px;border:none;font-size:13px;font-family:inherit;cursor:pointer;font-weight:600;transition:filter .15s}
      .btn:hover{filter:brightness(1.12)}
      .btn-wa{background:#25D366;color:#fff}
      .btn-web{background:#4361ee;color:#fff}
      .btn-close{background:#2a2a4a;color:#e9e9f5;flex:0.6}
    </style></head>
    <body>
      <div class="drag">
        <span class="drag-title">Hakk\u0131nda</span>
        <button class="close-btn" id="btnClose">\u2715</button>
      </div>
      <div class="body">
        <div class="app-name">MTSK Uygulamas\u0131</div>
        <div class="tagline">Motorlu Ta\u015F\u0131t S\xFCr\xFCc\xFCleri Kursu Y\xF6netim Sistemi</div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Uygulama</span><span class="info-val">v${installedVer}</span></div>
          <div class="info-row"><span class="info-label">Uzak kod</span><span class="info-val">${remoteVer}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Durum</span><span class="info-val">${statusLine}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Web</span><span class="info-val">mtsk.app</span></div>
          <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-val">+90 552 187 03 34</span></div>
        </div>
        <div class="btns">
          <button class="btn btn-wa" id="btnWa">${WHATSAPP_ICON} WhatsApp</button>
          <button class="btn btn-web" id="btnWeb">${APP_ICON} Web Sitesi</button>
          <button class="btn btn-close" id="btnClose2">Kapat</button>
        </div>
      </div>
      <script>
        const {ipcRenderer} = require('electron');
        document.getElementById('btnWa').onclick = () => ipcRenderer.send('about:action', 'wa');
        document.getElementById('btnWeb').onclick = () => ipcRenderer.send('about:action', 'web');
        document.getElementById('btnClose').onclick = () => ipcRenderer.send('about:action', 'close');
        document.getElementById('btnClose2').onclick = () => ipcRenderer.send('about:action', 'close');
      </script>
    </body></html>`;
    aboutWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    aboutWin.once("ready-to-show", () => aboutWin.show());
    await new Promise((resolve) => {
      const { ipcMain: ipc } = require("electron");
      const handler = (_e, action) => {
        ipc.removeListener("about:action", handler);
        if (!aboutWin.isDestroyed())
          aboutWin.close();
        if (action === "wa")
          import_electron7.shell.openExternal("https://wa.me/905521870334");
        else if (action === "web")
          import_electron7.shell.openExternal("https://mtsk.app");
        resolve();
      };
      ipc.on("about:action", handler);
      aboutWin.on("closed", () => {
        ipc.removeListener("about:action", handler);
        resolve();
      });
    });
  }
  async function showDireksiyonPdfDialog() {
    if (!mainWindow || mainWindow.isDestroyed())
      return;
    const r1 = await import_electron7.dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Direksiyon Takip PDF",
      message: "Hangi s\u0131n\u0131f i\xE7in test PDF olu\u015Fturulsun?",
      buttons: ["Yeni A (14)", "Yeni B (16)", "Ge\xE7i\u015F\u2026", "\u0130ptal"],
      defaultId: 1,
      cancelId: 3,
      noLink: true
    });
    let sinif = null;
    if (r1.response === 0)
      sinif = "0,A|14";
    else if (r1.response === 1)
      sinif = "0,B|16";
    else if (r1.response === 2) {
      const r2 = await import_electron7.dialog.showMessageBox(mainWindow, {
        type: "question",
        title: "Ge\xE7i\u015F T\xFCr\xFC",
        message: "Hangi ge\xE7i\u015F t\xFCr\xFC i\xE7in PDF olu\u015Fturulsun?",
        buttons: [
          "B(Sonras\u0131)\u2192C (22)",
          "B(\xD6ncesi)\u2192C (16)",
          "B(Sonras\u0131)\u2192D (16)",
          "B(\xD6ncesi)\u2192D (9)",
          "C \u2192 CE (8)",
          "C \u2192 D (9)",
          "D \u2192 C (12)",
          "\u0130ptal"
        ],
        defaultId: 0,
        cancelId: 7,
        noLink: true
      });
      if (r2.response === 0)
        sinif = "B(2016 Sonras\u0131),C|22";
      else if (r2.response === 1)
        sinif = "B(2016 \xD6ncesi),C|16";
      else if (r2.response === 2)
        sinif = "B(2016 Sonras\u0131),D|16";
      else if (r2.response === 3)
        sinif = "B(2016 \xD6ncesi),D|9";
      else if (r2.response === 4)
        sinif = "C,CE|8";
      else if (r2.response === 5)
        sinif = "C,D|9";
      else if (r2.response === 6)
        sinif = "D,C|12";
    }
    if (!sinif)
      return;
    try {
      await mebbisManager.generateTestDireksiyonPdf(sinif, mainWindow);
    } catch (err) {
      import_electron7.dialog.showErrorBox("PDF Olu\u015Fturulamad\u0131", err?.message || "Bilinmeyen hata");
    }
  }
  async function showFakeListDialog(kind) {
    if (!mainWindow || mainWindow.isDestroyed())
      return;
    const KURUM = "99993164/\xD6ZEL AYDINCIK BATUHAN MOTORLU TA\u015EIT S\xDCR\xDCC\xDCLER\u0130 KURSU";
    const fakeStudents = [
      {
        tc: "14674579946",
        adSoyad: "MEHMET \xC7EL\u0130K",
        hasDetail: true,
        kurum: KURUM,
        donemi: "2026 - May\u0131s",
        grubu: "Grup-1",
        subesi: "C",
        mevcutBelge: "B SINIFI SERT\u0130F\u0130KA",
        istenenSertifika: "C SINIFI SERT\u0130F\u0130KA (Manuel)",
        kurumOnay: "Onayland\u0131",
        ilceOnay: "Onayland\u0131",
        uygulama: "Muaf veya Ge\xE7ti",
        durumu: "Sertifika Almaya Hak Kazand\u0131",
        teorikHak: 1,
        uygulamaHak: 0,
        eSinavHak: 1,
        kayitUcreti: 162272,
        exams: [
          { donemi: "2026 - Nisan", sinavKodu: "13303121", sinavTarihi: "25/04/2026", plaka: "33HE190", ustaOgretici: "YETK\u0130NER TOKLU", onayDurumu: "Onayland\u0131", sinavDurumu: "S\u0131nava Girdi", sonuc: "Ba\u015Far\u0131l\u0131" }
        ],
        lessons: [
          { donemi: "2026 - May\u0131s", grupAdi: "Grup 1", grupBaslama: "02/05/2026", subesi: "C \u015EUBES\u0130", plaka: "33L3380", dersYeri: "Akan Trafik", dersTarihi: "04/05/2026", dersSaati: "15:00 - 15:50", personel: "\u0130BRAH\u0130M \xC7ITIRKI", egitimTuru: "Normal E\u011Fitim" },
          { donemi: "2026 - May\u0131s", grupAdi: "Grup 1", grupBaslama: "02/05/2026", subesi: "C \u015EUBES\u0130", plaka: "33L3380", dersYeri: "Akan Trafik", dersTarihi: "05/05/2026", dersSaati: "15:00 - 15:50", personel: "\u0130BRAH\u0130M \xC7ITIRKI", egitimTuru: "Normal E\u011Fitim" }
        ]
      },
      {
        tc: "23456789012",
        adSoyad: "AY\u015EE YILMAZ",
        hasDetail: true,
        kurum: KURUM,
        donemi: "2026 - May\u0131s",
        grubu: "Grup-2",
        subesi: "B",
        mevcutBelge: "\u2014",
        istenenSertifika: "B SINIFI SERT\u0130F\u0130KA",
        kurumOnay: "Onayland\u0131",
        ilceOnay: "Beklemede",
        uygulama: "Devam Ediyor",
        durumu: "E\u011Fitim S\xFCr\xFCyor",
        teorikHak: 2,
        uygulamaHak: 2,
        eSinavHak: 2,
        kayitUcreti: 92500,
        exams: [],
        lessons: [
          { donemi: "2026 - May\u0131s", grupAdi: "Grup 2", grupBaslama: "02/05/2026", subesi: "B \u015EUBES\u0130", plaka: "34ABC123", dersYeri: "Park ve Manevra", dersTarihi: "06/05/2026", dersSaati: "09:00 - 09:50", personel: "AYHAN DEM\u0130R", egitimTuru: "Normal E\u011Fitim" }
        ]
      },
      {
        tc: "34567890123",
        adSoyad: "AHMET KAYA",
        hasDetail: true,
        kurum: KURUM,
        donemi: "2026 - Nisan",
        grubu: "Grup-1",
        subesi: "B",
        mevcutBelge: "\u2014",
        istenenSertifika: "B SINIFI SERT\u0130F\u0130KA",
        kurumOnay: "Onayland\u0131",
        ilceOnay: "Onayland\u0131",
        uygulama: "S\u0131nava Girdi",
        durumu: "Tekrar S\u0131nava Girecek",
        teorikHak: 0,
        uygulamaHak: 1,
        eSinavHak: 0,
        kayitUcreti: 92500,
        exams: [
          { donemi: "2026 - Nisan", sinavKodu: "13301204", sinavTarihi: "20/04/2026", plaka: "33L3380", ustaOgretici: "MET\u0130N ARSLAN", onayDurumu: "Onayland\u0131", sinavDurumu: "S\u0131nava Girdi", sonuc: "Ba\u015Far\u0131s\u0131z" },
          { donemi: "2026 - Nisan", sinavKodu: "13301888", sinavTarihi: "28/04/2026", plaka: "33XY789", ustaOgretici: "MET\u0130N ARSLAN", onayDurumu: "Onayland\u0131", sinavDurumu: "S\u0131nava Girmedi", sonuc: "\u2014" }
        ],
        lessons: [
          { donemi: "2026 - Nisan", grupAdi: "Grup 1", grupBaslama: "01/04/2026", subesi: "B \u015EUBES\u0130", plaka: "33L3380", dersYeri: "Akan Trafik", dersTarihi: "15/04/2026", dersSaati: "14:00 - 14:50", personel: "MET\u0130N ARSLAN", egitimTuru: "Normal E\u011Fitim" }
        ]
      },
      {
        tc: "45678901234",
        adSoyad: "EL\u0130F DEM\u0130R",
        hasDetail: true,
        kurum: KURUM,
        donemi: "2026 - May\u0131s",
        grubu: "Grup-3",
        subesi: "A2",
        mevcutBelge: "B SINIFI SERT\u0130F\u0130KA",
        istenenSertifika: "A2 SINIFI SERT\u0130F\u0130KA (Manuel)",
        kurumOnay: "Onayland\u0131",
        ilceOnay: "Onayland\u0131",
        uygulama: "Devam Ediyor",
        durumu: "E\u011Fitim S\xFCr\xFCyor",
        teorikHak: 1,
        uygulamaHak: 2,
        eSinavHak: 1,
        kayitUcreti: 75e3,
        exams: [],
        lessons: [
          { donemi: "2026 - May\u0131s", grupAdi: "Grup 3", grupBaslama: "03/05/2026", subesi: "A2 \u015EUBES\u0130", plaka: "06FK4567", dersYeri: "Akan Trafik", dersTarihi: "07/05/2026", dersSaati: "10:00 - 10:50", personel: "HASAN \xD6Z", egitimTuru: "Normal E\u011Fitim" },
          { donemi: "2026 - May\u0131s", grupAdi: "Grup 3", grupBaslama: "03/05/2026", subesi: "A2 \u015EUBES\u0130", plaka: "06FK4567", dersYeri: "Park ve Manevra", dersTarihi: "08/05/2026", dersSaati: "10:00 - 10:50", personel: "HASAN \xD6Z", egitimTuru: "Normal E\u011Fitim" }
        ]
      },
      // List-only (hasDetail: false) — came from skt02006 list, detail never fetched
      {
        tc: "56789012345",
        adSoyad: "MUSTAFA \u015EAH\u0130N",
        hasDetail: false,
        donemi: "2026 - May\u0131s",
        grubu: "Grup-1",
        subesi: "B",
        durumu: "E\u011Fitime Ba\u015Flamad\u0131",
        exams: [],
        lessons: []
      },
      {
        tc: "67890123456",
        adSoyad: "ZEYNEP \xD6ZT\xDCRK",
        hasDetail: false,
        donemi: "2026 - May\u0131s",
        grubu: "Grup-2",
        subesi: "B",
        durumu: "S\u0131nav Bekleniyor",
        exams: [],
        lessons: []
      }
    ];
    const platesOf = (s) => Array.from(new Set([
      ...s.exams.map((e) => e.plaka),
      ...s.lessons.map((l) => l.plaka)
    ].filter(Boolean)));
    const fakePlates = Array.from(
      new Set(fakeStudents.flatMap(platesOf))
    ).sort();
    const isStudents = kind === "students";
    const title = isStudents ? "\u{1F465} \xD6\u011Frenciler (\xF6rnek veri)" : "\u{1F697} Ara\xE7lar (\xF6rnek veri)";
    let bodyHtml = "";
    if (isStudents) {
      bodyHtml = fakeStudents.map((s) => {
        const ps = platesOf(s).join(", ");
        const meta = s.hasDetail ? ps || "\u2014" : `${s.donemi || ""} \xB7 ${s.grubu || ""} \xB7 ${s.subesi || ""}`.replace(/^[ ·]+|[ ·]+$/g, "") || "Liste kayd\u0131";
        const tag = s.hasDetail ? "" : '<span class="badge-tag">liste</span>';
        return `
        <div class="row" data-tc="${s.tc}">
          <div class="info">
            <div class="name">${s.adSoyad} ${tag}</div>
            <div class="tc">${s.tc} \xB7 ${meta}</div>
          </div>
          <button class="detay" data-tc="${s.tc}">Detay</button>
        </div>`;
      }).join("");
    } else {
      bodyHtml = fakePlates.map((p) => `<div class="row"><div class="plate">${p}</div></div>`).join("");
    }
    const fakeStudentsJson = JSON.stringify(fakeStudents).replace(/<\/script/gi, "<\\/script");
    const listWin = new import_electron7.BrowserWindow({
      width: 420,
      height: 520,
      resizable: true,
      minimizable: false,
      maximizable: false,
      frame: false,
      alwaysOnTop: true,
      center: true,
      parent: mainWindow,
      modal: true,
      show: false,
      backgroundColor: "#1a1a2e",
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false }
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#1a1a2e;color:#e9e9f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;height:100vh;user-select:none;-webkit-user-select:none}
      .drag{-webkit-app-region:drag;background:#12122a;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .drag-title{font-size:13px;color:#8888aa;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .icon-btn{-webkit-app-region:no-drag;background:none;border:none;color:#8888aa;font-size:14px;cursor:pointer;padding:2px 8px;line-height:1;border-radius:4px}
      .icon-btn:hover{color:#fff;background:#2a2a4a}
      .close-btn{font-size:18px}
      .body{flex:1;overflow-y:auto;padding:8px 0}
      .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;border-bottom:1px solid #20203a}
      .row:hover{background:#12122a}
      .info{flex:1;min-width:0}
      .name{font-size:13px;color:#e9e9f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tc{font-size:11px;color:#6b6b8a;margin-top:2px}
      .plate{font-size:13px;color:#ddd;font-family:Consolas,monospace;letter-spacing:0.5px}
      .detay{background:#2a2a4a;border:none;color:#4361ee;cursor:pointer;padding:5px 12px;font-size:11px;border-radius:4px;font-weight:600}
      .detay:hover{background:#33335a}
      .footer{background:#12122a;padding:8px 16px;font-size:11px;color:#6b6b8a;text-align:center;border-top:1px solid #2a2a4a}
      .hidden{display:none !important}

      /* Detail view */
      #detail-view .body{padding:0}
      .det-hero{padding:18px 20px 14px;background:linear-gradient(180deg,#22224a 0%,#1a1a2e 100%);border-bottom:1px solid #2a2a4a}
      .det-name{font-size:18px;font-weight:700;color:#e9e9f5}
      .det-tc{font-size:12px;color:#8888aa;margin-top:2px;font-family:Consolas,monospace}
      .det-status{display:inline-block;margin-top:8px;padding:3px 10px;font-size:11px;border-radius:10px;font-weight:600;background:#1a3a2e;color:#4ade80}
      .det-status.pending{background:#3a2e1a;color:#fbbf24}
      .det-status.fail{background:#3a1a1a;color:#f87171}
      .section{padding:14px 20px;border-bottom:1px solid #20203a}
      .section-title{font-size:11px;color:#4361ee;font-weight:700;letter-spacing:0.8px;margin-bottom:10px;text-transform:uppercase}
      .kv{display:grid;grid-template-columns:1fr 1.4fr;gap:8px 12px;font-size:12px}
      .kv-label{color:#6b6b8a}
      .kv-val{color:#ddd;text-align:right;word-break:break-word}
      .hak-row{display:flex;gap:8px;margin-top:6px}
      .hak{flex:1;background:#12122a;border:1px solid #2a2a4a;border-radius:6px;padding:8px;text-align:center}
      .hak-num{font-size:18px;font-weight:700;color:#4361ee}
      .hak-num.zero{color:#6b6b8a}
      .hak-lbl{font-size:10px;color:#8888aa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}
      .table{width:100%;font-size:11px;border-collapse:collapse}
      .table th{background:#12122a;color:#8888aa;font-weight:600;text-align:left;padding:6px 8px;border-bottom:1px solid #2a2a4a;font-size:10px;text-transform:uppercase;letter-spacing:0.4px}
      .table td{padding:6px 8px;border-bottom:1px solid #20203a;color:#ccc;vertical-align:top}
      .badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600}
      .badge.ok{background:#1a3a2e;color:#4ade80}
      .badge.fail{background:#3a1a1a;color:#f87171}
      .badge.pending{background:#3a2e1a;color:#fbbf24}
      .empty{padding:20px;text-align:center;color:#666;font-size:12px;font-style:italic}
      .badge-tag{display:inline-block;padding:1px 6px;font-size:9px;border-radius:6px;background:#3a2e1a;color:#fbbf24;margin-left:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:middle}
      .empty-state{padding:40px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
      .empty-title{font-size:14px;color:#e9e9f5;font-weight:600}
      .empty-desc{font-size:12px;color:#8888aa;line-height:1.5;max-width:300px;font-style:normal}
      .cta-btn{margin-top:6px;background:#4361ee;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
      .cta-btn:hover{filter:brightness(1.12)}
      .cta-btn:disabled{opacity:0.6;cursor:wait}
      .empty-note{font-size:10px;color:#6b6b8a;margin-top:6px;font-style:italic}
    </style></head><body>
      <!-- LIST VIEW -->
      <div id="list-view" style="display:flex;flex-direction:column;height:100vh">
        <div class="drag">
          <div class="drag-title">${title}</div>
          <button class="icon-btn close-btn" id="close-btn">\xD7</button>
        </div>
        <div class="body">${bodyHtml}</div>
        <div class="footer">\xD6rnek veri \u2014 ger\xE7ek kay\u0131tlar de\u011Fil</div>
      </div>

      <!-- DETAIL VIEW -->
      <div id="detail-view" class="hidden" style="flex-direction:column;height:100vh">
        <div class="drag">
          <button class="icon-btn" id="back-btn" title="Geri">\u2039 Geri</button>
          <div class="drag-title" id="det-title-bar">\xD6\u011Frenci Detay</div>
          <button class="icon-btn close-btn" id="close-btn-2">\xD7</button>
        </div>
        <div class="body" id="detail-body"></div>
        <div class="footer">\xD6rnek veri \u2014 ger\xE7ek kay\u0131tlar de\u011Fil</div>
      </div>

      <script>
        const STUDENTS = ${fakeStudentsJson};
        const listView = document.getElementById('list-view');
        const detailView = document.getElementById('detail-view');
        const detailBody = document.getElementById('detail-body');
        const titleBar = document.getElementById('det-title-bar');

        document.getElementById('close-btn').onclick = () => window.close();
        document.getElementById('close-btn-2').onclick = () => window.close();
        document.getElementById('back-btn').onclick = () => showList();

        function showList() {
          detailView.classList.add('hidden');
          detailView.style.display = 'none';
          listView.classList.remove('hidden');
          listView.style.display = 'flex';
        }
        function showDetail(tc) {
          const s = STUDENTS.find(x => x.tc === tc);
          if (!s) { console.log('[FakeList] No student for tc=' + tc); return; }
          listView.style.display = 'none';
          detailView.classList.remove('hidden');
          detailView.style.display = 'flex';
          titleBar.textContent = s.adSoyad;
          detailBody.innerHTML = renderDetail(s);
          detailBody.scrollTop = 0;
        }

        function statusClass(durum) {
          const d = (durum || '').toLowerCase();
          if (d.includes('hak kazand\u0131') || d.includes('ba\u015Far\u0131l\u0131') || d.includes('tamamland\u0131')) return '';
          if (d.includes('ba\u015Far\u0131s\u0131z') || d.includes('iptal') || d.includes('red')) return 'fail';
          return 'pending';
        }
        function badge(text) {
          const t = (text || '').toLowerCase();
          let cls = 'pending';
          if (t === 'ba\u015Far\u0131l\u0131' || t === 'onayland\u0131' || t === 's\u0131nava girdi') cls = 'ok';
          else if (t === 'ba\u015Far\u0131s\u0131z' || t === 's\u0131nava girmedi' || t === 'iptal') cls = 'fail';
          return '<span class="badge ' + cls + '">' + (text || '\u2014') + '</span>';
        }

        function renderDetail(s) {
          if (!s.hasDetail) {
            return \`
              <div class="det-hero">
                <div class="det-name">\${s.adSoyad}</div>
                <div class="det-tc">\${s.tc} \xB7 \${s.donemi || '\u2014'} \xB7 \${s.grubu || '\u2014'} \xB7 \u015Eube \${s.subesi || '\u2014'}</div>
                <div class="det-status pending">\${s.durumu || 'Detay Y\xFCklenmedi'}</div>
              </div>
              <div class="empty-state">
                <div class="empty-title">Bu \xF6\u011Frenci sadece liste kayd\u0131</div>
                <div class="empty-desc">S\u0131nav ge\xE7mi\u015Fi, ders program\u0131, sertifika ve hak bilgileri i\xE7in MEBBIS'e gidip TC ile sorgulanmal\u0131. Tek t\u0131klay\u0131n, biz hallederiz.</div>
                <button id="fetch-detay-btn" class="cta-btn" data-tc="\${s.tc}">\u2913 Detay Getir</button>
                <div class="empty-note">\xF6rnek veri \u2014 ger\xE7ek bir sorgu yap\u0131lmaz</div>
              </div>
            \`;
          }
          const platesAll = Array.from(new Set([
            ...s.exams.map(e => e.plaka),
            ...s.lessons.map(l => l.plaka)
          ].filter(Boolean)));
          const passed = s.exams.filter(e => (e.sonuc || '').toLowerCase() === 'ba\u015Far\u0131l\u0131').length;
          const failed = s.exams.filter(e => (e.sonuc || '').toLowerCase() === 'ba\u015Far\u0131s\u0131z').length;
          const teachers = Array.from(new Set([
            ...s.exams.map(e => e.ustaOgretici),
            ...s.lessons.map(l => l.personel)
          ].filter(Boolean)));

          const examRows = s.exams.length ? s.exams.map(e => \`
            <tr>
              <td>\${e.donemi}</td><td>\${e.sinavTarihi}</td><td>\${e.plaka}</td>
              <td>\${e.ustaOgretici}</td><td>\${badge(e.sinavDurumu)}</td><td>\${badge(e.sonuc)}</td>
            </tr>\`).join('') : '<tr><td colspan="6" class="empty">S\u0131nav kayd\u0131 yok</td></tr>';

          const lessonRows = s.lessons.length ? s.lessons.map(l => \`
            <tr>
              <td>\${l.dersTarihi}</td><td>\${l.dersSaati}</td><td>\${l.plaka}</td>
              <td>\${l.dersYeri}</td><td>\${l.personel}</td><td>\${l.egitimTuru}</td>
            </tr>\`).join('') : '<tr><td colspan="6" class="empty">Ders kayd\u0131 yok</td></tr>';

          return \`
            <div class="det-hero">
              <div class="det-name">\${s.adSoyad}</div>
              <div class="det-tc">\${s.tc} \xB7 \${s.donemi} \xB7 \${s.grubu} \xB7 \u015Eube \${s.subesi}</div>
              <div class="det-status \${statusClass(s.durumu)}">\${s.durumu}</div>
            </div>

            <div class="section">
              <div class="section-title">Genel Bilgiler</div>
              <div class="kv">
                <div class="kv-label">Kurum</div><div class="kv-val">\${s.kurum}</div>
                <div class="kv-label">Mevcut Belge</div><div class="kv-val">\${s.mevcutBelge}</div>
                <div class="kv-label">\u0130stenen Sertifika</div><div class="kv-val">\${s.istenenSertifika}</div>
                <div class="kv-label">Kurum Onay\u0131</div><div class="kv-val">\${badge(s.kurumOnay)}</div>
                <div class="kv-label">\u0130l\xE7e Onay\u0131</div><div class="kv-val">\${badge(s.ilceOnay)}</div>
                <div class="kv-label">Uygulama Durumu</div><div class="kv-val">\${s.uygulama}</div>
                <div class="kv-label">Kay\u0131t \xDCcreti</div><div class="kv-val">\${(s.kayitUcreti||0).toLocaleString('tr-TR')} \u20BA</div>
                <div class="kv-label">Ara\xE7lar</div><div class="kv-val">\${platesAll.join(', ') || '\u2014'}</div>
                <div class="kv-label">E\u011Fitmenler</div><div class="kv-val">\${teachers.join(', ') || '\u2014'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">S\u0131nav Haklar\u0131</div>
              <div class="hak-row">
                <div class="hak"><div class="hak-num \${s.teorikHak ? '' : 'zero'}">\${s.teorikHak}</div><div class="hak-lbl">Teorik</div></div>
                <div class="hak"><div class="hak-num \${s.uygulamaHak ? '' : 'zero'}">\${s.uygulamaHak}</div><div class="hak-lbl">Uygulama</div></div>
                <div class="hak"><div class="hak-num \${s.eSinavHak ? '' : 'zero'}">\${s.eSinavHak}</div><div class="hak-lbl">E-S\u0131nav</div></div>
              </div>
              <div style="margin-top:10px;font-size:11px;color:#8888aa">
                Ge\xE7ti: <span style="color:#4ade80;font-weight:600">\${passed}</span> \xB7
                Kald\u0131: <span style="color:#f87171;font-weight:600">\${failed}</span> \xB7
                Toplam S\u0131nav: <span style="color:#ddd;font-weight:600">\${s.exams.length}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">S\u0131nav Ge\xE7mi\u015Fi</div>
              <table class="table">
                <thead><tr><th>D\xF6nem</th><th>Tarih</th><th>Plaka</th><th>Usta \xD6\u011Fretici</th><th>Durum</th><th>Sonu\xE7</th></tr></thead>
                <tbody>\${examRows}</tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Ders Program\u0131</div>
              <table class="table">
                <thead><tr><th>Tarih</th><th>Saat</th><th>Plaka</th><th>Yer</th><th>Personel</th><th>T\xFCr</th></tr></thead>
                <tbody>\${lessonRows}</tbody>
              </table>
            </div>
          \`;
        }

        document.querySelectorAll('.detay').forEach(b => {
          b.onclick = () => {
            const tc = b.getAttribute('data-tc');
            console.log('[FakeList] Detay opening tc=' + tc);
            showDetail(tc);
          };
        });

        // Delegated handler for Detay Getir CTA inside detail empty state
        detailBody.addEventListener('click', (ev) => {
          const btn = ev.target && ev.target.closest && ev.target.closest('#fetch-detay-btn');
          if (!btn) return;
          const tc = btn.getAttribute('data-tc');
          console.log('[FakeList] Detay Getir clicked tc=' + tc);
          btn.disabled = true;
          btn.textContent = '\u23F3 Sorgulan\u0131yor\u2026';
          // Simulated fetch \u2014 real flow would fire MEBBIS_OPEN_STUDENT:<tc>
          setTimeout(() => {
            const s = STUDENTS.find(x => x.tc === tc);
            if (!s) return;
            // Promote fake student to detailed with placeholder rich data
            s.hasDetail = true;
            s.kurum = s.kurum || '99993164/\xD6ZEL AYDINCIK BATUHAN MOTORLU TA\u015EIT S\xDCR\xDCC\xDCLER\u0130 KURSU';
            s.mevcutBelge = s.mevcutBelge || '\u2014';
            s.istenenSertifika = s.istenenSertifika || 'B SINIFI SERT\u0130F\u0130KA';
            s.kurumOnay = s.kurumOnay || 'Onayland\u0131';
            s.ilceOnay = s.ilceOnay || 'Onayland\u0131';
            s.uygulama = s.uygulama || 'Yeni Veri';
            s.teorikHak = s.teorikHak ?? 1;
            s.uygulamaHak = s.uygulamaHak ?? 1;
            s.eSinavHak = s.eSinavHak ?? 1;
            s.kayitUcreti = s.kayitUcreti ?? 92500;
            s.exams = [];
            s.lessons = [];
            showDetail(tc);
          }, 700);
        });
      </script>
    </body></html>`;
    await listWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    listWin.once("ready-to-show", () => listWin.show());
  }
  async function showSimulatorPdfDialog() {
    if (!mainWindow || mainWindow.isDestroyed())
      return;
    const r = await import_electron7.dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Sim\xFClasyon Raporu PDF",
      message: "Hangi tip sim\xFClasyon raporu olu\u015Fturulsun?",
      detail: "Rastgele test verisi ile PDF \xFCretilir.",
      buttons: ["Sesim (1 rapor)", "Ana Grup (11 rapor)", "Her \u0130kisi (12 rapor)", "\u0130ptal"],
      defaultId: 0,
      cancelId: 3,
      noLink: true
    });
    let simType = null;
    if (r.response === 0)
      simType = "sesim";
    else if (r.response === 1)
      simType = "ana_grup";
    else if (r.response === 2)
      simType = "both";
    if (!simType)
      return;
    try {
      await mebbisManager.generateTestSimulatorPdf(simType, mainWindow);
    } catch (err) {
      import_electron7.dialog.showErrorBox("PDF Olu\u015Fturulamad\u0131", err?.message || "Bilinmeyen hata");
    }
  }
  async function showKBelgesiPdfDialog() {
    if (!mainWindow || mainWindow.isDestroyed())
      return;
    const r = await import_electron7.dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "K Belgesi PDF",
      message: "PDF arka plan formu i\xE7ersin mi?",
      detail: "Arka Planl\u0131: forma do\u011Fru hizaland\u0131\u011F\u0131n\u0131 g\xF6rmek i\xE7in tam form g\xF6r\xFCnt\xFCs\xFCyle birlikte \xFCretir.\nArka Plans\u0131z: sadece doldurulan de\u011Ferler \u2014 resmi \xF6nceden bas\u0131lm\u0131\u015F K Belgesi ka\u011F\u0131d\u0131na yazd\u0131rmak i\xE7in.",
      buttons: ["Arka Planl\u0131", "Arka Plans\u0131z", "\u0130ptal"],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    });
    if (r.response === 2)
      return;
    const withBackground = r.response === 0;
    try {
      await mebbisManager.generateTestKBelgesiPdf(mainWindow, withBackground);
    } catch (err) {
      import_electron7.dialog.showErrorBox("K Belgesi Olu\u015Fturulamad\u0131", err?.message || "Bilinmeyen hata");
    }
  }
  function setupIPC() {
    import_electron7.ipcMain.handle("device:id", () => ctx.getDeviceId());
    import_electron7.ipcMain.handle("whats-new:check", () => ctx.getPendingWhatsNew());
    import_electron7.ipcMain.handle("whats-new:dismiss", () => {
      ctx.markWhatsNewSeen();
      return true;
    });
    import_electron7.ipcMain.handle("profile:get", async () => {
      const token = authStore.getToken();
      if (!token)
        throw new Error("Not authenticated");
      return apiClient.getProfile(token);
    });
    import_electron7.ipcMain.handle("profile:update", async (_event, phone) => {
      const token = authStore.getToken();
      if (!token)
        throw new Error("Not authenticated");
      return apiClient.updateProfile(token, phone);
    });
    import_electron7.ipcMain.handle("app:is-dev", () => ctx.isDev);
    import_electron7.ipcMain.handle("desktop-code:version", () => ctx.codeLoader.getVersion());
    import_electron7.ipcMain.handle("app:version", () => ctx.appVersion);
    import_electron7.ipcMain.handle("dev:test-direksiyon-pdf", async (_event, sinif) => {
      if (!ctx.isDev)
        throw new Error("Only available in development mode");
      if (!mainWindow)
        throw new Error("No main window");
      return mebbisManager.generateTestDireksiyonPdf(sinif || "0,B|16", mainWindow);
    });
    import_electron7.ipcMain.handle("dev:test-simulator-pdf", async (_event, simType) => {
      if (!ctx.isDev)
        throw new Error("Only available in development mode");
      if (!mainWindow)
        throw new Error("No main window");
      return mebbisManager.generateTestSimulatorPdf(simType || "sesim", mainWindow);
    });
    import_electron7.ipcMain.handle("auth:check", async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token || !user)
        return null;
      try {
        const isAdmin = ctx.isDev && (user.userType === -1 || user.userType === -2);
        if (isAdmin) {
          return { user, school: null };
        }
        const school = await apiClient.getMySchool(token).catch(() => null);
        if (school?.name)
          authStore.setSavedSchoolName(school.name);
        return { user, school };
      } catch {
        authStore.clear();
        return null;
      }
    });
    import_electron7.ipcMain.handle("auth:login", async (_event, email, password, autoLogin) => {
      try {
        const result = await apiClient.login(email, password);
        authStore.save(result.token, result.user);
        authStore.setRememberedPassword(password);
        authStore.setAutoLogin(autoLogin === true);
        const isAdmin = ctx.isDev && (result.user.userType === -1 || result.user.userType === -2);
        console.log("[auth:login] Logged in:", email, "userType:", result.user.userType, "isAdmin:", isAdmin);
        let school = null;
        if (!isAdmin) {
          school = await apiClient.getMySchool(result.token).catch(() => null);
          if (school?.name)
            authStore.setSavedSchoolName(school.name);
        }
        pullAll().catch((e) => console.error("[StudentSync] Login pull failed:", e));
        return { user: result.user, school };
      } catch (err) {
        const raw = String(err?.message || "");
        if (/invalid credentials/i.test(raw) || /unauthorized/i.test(raw)) {
          throw new Error("E-posta veya \u015Fifre hatal\u0131. L\xFCtfen bilgilerinizi kontrol edip tekrar deneyin.");
        }
        if (/timed out|ECONN|network|fetch failed/i.test(raw)) {
          throw new Error("Sunucuya ula\u015F\u0131lam\u0131yor. L\xFCtfen internet ba\u011Flant\u0131n\u0131z\u0131 kontrol edip tekrar deneyin.");
        }
        throw new Error(raw || "Giri\u015F ba\u015Far\u0131s\u0131z. L\xFCtfen tekrar deneyin.");
      }
    });
    import_electron7.ipcMain.handle("auth:logout", async () => {
      const token = authStore.getToken();
      if (token) {
        try {
          await apiClient.logout(token);
        } catch {
        }
      }
      authStore.clear();
      return true;
    });
    import_electron7.ipcMain.handle("auth:get-saved-email", () => authStore.getSavedEmail());
    import_electron7.ipcMain.handle("auth:get-saved-school", () => authStore.getSavedSchoolName());
    import_electron7.ipcMain.handle("auth:get-saved-credentials", () => ({
      email: authStore.getSavedEmail(),
      password: authStore.getRememberedPassword(),
      autoLogin: authStore.getAutoLogin()
    }));
    import_electron7.ipcMain.handle("auth:set-auto-login", (_event, value) => {
      authStore.setAutoLogin(!!value);
      return true;
    });
    import_electron7.ipcMain.handle("auth:forgot-password", async (_event, email, phone) => {
      try {
        return await apiClient.forgotPassword(email, phone);
      } catch (err) {
        return { success: false, message: err?.message || "Bir hata olu\u015Ftu." };
      }
    });
    import_electron7.ipcMain.handle("auth:verify-reset-code", async (_event, email, code) => {
      try {
        return await apiClient.verifyResetCode(email, code);
      } catch (err) {
        return { success: false, message: err?.message || "Bir hata olu\u015Ftu." };
      }
    });
    import_electron7.ipcMain.handle("auth:reset-password", async (_event, email, code, newPassword) => {
      try {
        return await apiClient.resetPassword(email, code, newPassword);
      } catch (err) {
        return { success: false, message: err?.message || "Bir hata olu\u015Ftu." };
      }
    });
    import_electron7.ipcMain.handle("shell:open-external", async (_event, url) => {
      if (url.startsWith("https://")) {
        await import_electron7.shell.openExternal(url);
      }
    });
    mebbisManager.setActivityLogger((schoolIdStr, pdfType, count) => {
      const schoolId = parseInt(schoolIdStr, 10);
      if (!Number.isFinite(schoolId))
        return;
      logActivity({ event: "pdf_download", school_id: schoolId, pdf_type: pdfType, count });
    });
    configureTemplateErrorReporter(
      () => authStore.getToken(),
      () => 0
    );
    import_electron7.ipcMain.handle("accounts:list", async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token)
        return [];
      try {
        const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
        const dbAccounts = isAdmin ? await apiClient.getAllSchools(token) : await apiClient.getMebbisAccounts(token);
        console.log(`[accounts:list] IS_DEV=${ctx.isDev} userType=${user?.userType} isAdmin=${isAdmin} count=${dbAccounts.length}`);
        return dbAccounts.map((m) => ({
          ...dbToAccount(m),
          isRunning: mebbisManager.isRunning(String(m.id)),
          subscription: m.subscription
        }));
      } catch (err) {
        console.error("[accounts:list] Failed to fetch accounts. userType:", user?.userType, "isAdmin:", user?.userType === -1 || user?.userType === -2, "error:", err?.message || String(err));
        return [];
      }
    });
    import_electron7.ipcMain.handle("accounts:add", async (_event, data) => {
      const token = authStore.getToken();
      if (!token)
        throw new Error("Not authenticated");
      let dbAccounts = await apiClient.getMebbisAccounts(token);
      if (!dbAccounts.length) {
        await apiClient.setupSchool(token, data.label || "S\xFCr\xFCc\xFC Kursum");
        dbAccounts = await apiClient.getMebbisAccounts(token);
      }
      if (!dbAccounts.length)
        throw new Error("No driving school found for this account");
      const target = dbAccounts.find((m) => !m.username) ?? dbAccounts[0];
      const result = await apiClient.upsertMebbisAccount(token, target.id, {
        username: data.username,
        password: data.password
      });
      return dbToAccount(result);
    });
    import_electron7.ipcMain.handle("accounts:update", async (_event, data) => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token)
        throw new Error("Not authenticated");
      const schoolId = parseInt(data.id, 10);
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin ? await apiClient.getAllSchools(token) : await apiClient.getMebbisAccounts(token);
      const current = dbAccounts.find((m) => m.id === schoolId);
      if (!current)
        throw new Error("Account not found");
      const result = await apiClient.upsertMebbisAccount(token, schoolId, {
        username: data.username ?? current.username ?? "",
        password: data.password ?? current.password ?? "",
        simulatorType: data.simulatorType
      });
      return dbToAccount(result);
    });
    import_electron7.ipcMain.handle("accounts:remove", async (_event, id) => {
      const token = authStore.getToken();
      if (!token)
        throw new Error("Not authenticated");
      mebbisManager.stop(id);
      const partition = `persist:mebbis-${id}`;
      const ses = import_electron7.session.fromPartition(partition);
      await ses.clearStorageData();
      await apiClient.removeMebbisAccount(token, parseInt(id, 10));
      return true;
    });
    import_electron7.ipcMain.handle("accounts:start", async (_event, id) => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token)
        throw new Error("Not authenticated");
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin ? await apiClient.getAllSchools(token) : await apiClient.getMebbisAccounts(token);
      const found = dbAccounts.find((m) => String(m.id) === id);
      if (!found)
        throw new Error("Account not found");
      if (!found.subscriptionActive) {
        throw new Error("SUBSCRIPTION_INACTIVE");
      }
      if (!found.simulatorType) {
        throw new Error("NO_SIMULATOR_TYPE");
      }
      const account = { ...dbToAccount(found), isRunning: false };
      mebbisManager.start(account, mainWindow);
      logActivity({ event: "school_login", school_id: found.id });
      return true;
    });
    import_electron7.ipcMain.handle("accounts:local-test", async (_event, id) => {
      const token = authStore.getToken();
      if (!token)
        throw new Error("Not authenticated");
      if (mebbisManager.isRunning(id)) {
        mebbisManager.focus(id);
        return true;
      }
      const dbAccounts = await apiClient.getAllSchools(token);
      const found = dbAccounts.find((m) => String(m.id) === id);
      if (!found)
        throw new Error("Account not found");
      const account = { ...dbToAccount(found), isRunning: false };
      mebbisManager.startLocalTest(account, mainWindow);
      return true;
    });
    import_electron7.ipcMain.handle("accounts:stop", async (_event, id) => {
      mebbisManager.stop(id);
      return true;
    });
    import_electron7.ipcMain.handle("accounts:focus", async (_event, id) => {
      mebbisManager.focus(id);
      return true;
    });
    import_electron7.ipcMain.handle("accounts:get-status", async (_event, id) => {
      return mebbisManager.isRunning(id);
    });
  }
  setupIPC();
  mainWindow = createMainWindow();
  suppressLauncherWhatsNewIfPossible(ctx.codeLoader.getVersion());
  ctx.setupAutoUpdater(mainWindow);
  rebuildAppMenu();
  showBundleWhatsNew(mainWindow).catch(() => {
  });
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    const next = input.shift === true;
    if (next !== isShiftHeld) {
      isShiftHeld = next;
      rebuildAppMenu();
    }
  });
  mainWindow.on("blur", () => {
    if (isShiftHeld) {
      isShiftHeld = false;
      rebuildAppMenu();
    }
  });
  ctx.showWhatsNewIfUpdated(mainWindow);
  import_electron7.app.on("window-all-closed", () => {
    mebbisManager.stopAll();
    import_electron7.app.quit();
  });
  import_electron7.app.on("before-quit", () => {
    console.log("App quitting, flushing all cookies + student DB...");
    mebbisManager.stopAll();
    try {
      (init_student_db(), __toCommonJS(student_db_exports)).getStudentDb().flush();
    } catch (e) {
      console.error("StudentDb flush on quit failed:", e);
    }
  });
  import_electron7.app.on("activate", () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
  return { mainWindow };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  start
});
