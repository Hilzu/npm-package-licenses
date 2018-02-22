const registry = require("package-stream")();
const validLicenses = require("spdx-license-list/simple");
const licenses = new Map();
const seenPackages = new Set();

const multipleLicensesRegexp = /^\(.+\)$/;

const extraCharsRegexp = /[-0.v,]|license|the|public|version|clause|\s/g;

const licensesMap = {
  agpl3: "AGPL-3.0",
  apache: "Unknown Apache",
  apache2: "Apache-2.0",
  bsd: "Unknown BSD",
  bsd2: "BSD-2-Clause",
  bsd3: "BSD-3-Clause",
  bsd4: "BSD-4-Clause",
  gpl: "Unknown GPL",
  gpl2: "GPL-2.0",
  gpl3: "GPL-3.0",
  "gpl2+": "GPL-2.0+",
  "gpl3+": "GPL-3.0+",
  lgpl2: "LGPL-2.0",
  "lgpl2+": "LGPL-2.0+",
  lgpl21: "LGPL-2.1",
  "lgpl21+": "LGPL-2.1+",
  lgpl3: "LGPL-3.0",
  "lgpl3+": "LGPL-3.0+",
  mozilla2: "MPL-2.0",
};

const normalizeLicense = license => {
  if (license == null) return "None";
  if (typeof license === "string") {
    const trimmed = license.trim();

    if (trimmed === "") return "None";

    if (validLicenses.has(trimmed)) return trimmed;

    const uppercased = trimmed.toUpperCase();

    if (uppercased === "UNLICENSED") return "Unlicensed";

    if (validLicenses.has(uppercased)) return uppercased;

    const capitalized = uppercased[0] + trimmed.slice(1).toLowerCase();
    if (validLicenses.has(capitalized)) return capitalized;

    if (multipleLicensesRegexp.test(trimmed)) return "Multiple";

    if (uppercased.startsWith("SEE LICENSE IN")) return "Custom";

    const normalized = uppercased.toLowerCase().replace(extraCharsRegexp, "");

    if (normalized in licensesMap) return licensesMap[normalized];

    return "Unknown";
  }
  if (Array.isArray(license)) {
    if (license.length >= 2) {
      return "Multiple";
    }
    return normalizeLicense(license[0]);
  }
  if (license.hasOwnProperty("type")) return normalizeLicense(license.type);
  if (license.hasOwnProperty("name")) return normalizeLicense(license.name);
  if (license.hasOwnProperty("license"))
    return normalizeLicense(license.license);

  return "Unknown";
};

const printLicenseUsage = () => {
  const values = Array.from(licenses);
  values.sort(([k1, a1], [k2, a2]) => a2 - a1);
  console.log();
  values.forEach(([license, amount]) => {
    console.log(`${license}:\t${amount}`);
  });
};

process.on("SIGINT", () => {
  printLicenseUsage();
  process.exit(130);
});

process.on("SIGUSR2", () => {
  printLicenseUsage();
});

registry
  .on("package", pkg => {
    const name = pkg.name;
    if (seenPackages.has(name)) {
      console.log(`Package ${name} seen already!`);
      return;
    }
    seenPackages.add(name);

    const license = normalizeLicense(pkg.license);
    const amount = licenses.get(license) || 0;
    licenses.set(license, amount + 1);
  })
  .on("up-to-date", () => {
    printLicenseUsage();
    process.exit(0);
  });
