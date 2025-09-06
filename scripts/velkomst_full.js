function weekdayFile() {
  const tz = process.env.TIMEZONE || "Europe/Oslo";
  const wd = new Date().toLocaleDateString("nn-NO", { weekday: "long", timeZone: tz }).toLowerCase();

  if (wd.includes("mån")) return "meldinger_mandag.txt";
  if (wd.includes("tys")) return "meldinger_tysdag.txt";
  if (wd.includes("ons")) return "meldinger_onsdag.txt";
  if (wd.includes("tor") || wd.includes("tors")) return "meldinger_torsdag.txt";
  if (wd.includes("fre")) return "meldinger_fredag.txt";
  if (wd.includes("lau") || wd.includes("lør")) return "meldinger_laurdag.txt";
  if (wd.includes("søn") || wd.includes("søndag") || wd.includes("sundag")) return "meldinger_sondag.txt";

  // fallback (skulle aldri trengast, men fint å ha)
  return "meldinger_vanleg.txt";
}
