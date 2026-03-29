import type { JobItem } from "@workspace/api-spec/zod";

const RSS_URLS = [
  "https://www.jobkaka.com/feed/",
  "https://www.jobkaka.com/feed/?paged=2",
  "https://www.jobkaka.com/feed/?paged=3",
];

const SEARCH_FEEDS = [
  "https://www.jobkaka.com/?s=Bank+Jobs&feed=rss2",
  "https://www.jobkaka.com/?s=Railway+Jobs&feed=rss2",
  "https://www.jobkaka.com/?s=Police+Jobs&feed=rss2",
  "https://www.jobkaka.com/?s=Teaching+Jobs&feed=rss2",
  "https://www.jobkaka.com/?s=Engineering+Jobs&feed=rss2",
];

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
}

function extractBetweenTags(xml: string, tag: string): string {
  const cdataRe = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainRe = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i");
  const plainMatch = xml.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : "";
}

function extractLink(itemXml: string): string {
  const cdataMatch = itemXml.match(/<link><!\\[CDATA\\[(.*?)\\]\\]><\/link>/i);
  if (cdataMatch) return cdataMatch[1].trim();
  const between = itemXml.match(/<link>(https?:\/\/[^<]+)<\/link>/i);
  if (between) return between[1].trim();
  const guidePost = itemXml.match(/href="(https?:\/\/[^"]+)"/i);
  return guidePost ? guidePost[1].trim() : "";
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1];
    const title = extractBetweenTags(raw, "title");
    const link =
      extractBetweenTags(raw, "link") ||
      extractLink(raw);
    const pubDate = extractBetweenTags(raw, "pubDate");
    const content =
      extractBetweenTags(raw, "content:encoded") ||
      extractBetweenTags(raw, "description");

    if (title && link) {
      items.push({ title, link, pubDate, content });
    }
  }

  return items;
}

function parseTableRow(html: string, headers: string[]): Record<string, string> {
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const result: Record<string, string> = {};

  for (const row of rows) {
    const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map(
      (c) => c.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim()
    );
    if (cells.length >= 2 && !cells[0].toLowerCase().includes("post name")) {
      for (let i = 0; i < headers.length && i < cells.length; i++) {
        if (!result[headers[i]]) result[headers[i]] = cells[i];
      }
    }
  }
  return result;
}

function parseSalary(raw: string): [number, number] {
  const m = raw.match(/Rs\.([\d,]+)-([\d,]+)/);
  if (!m) return [0, 0];
  const min = parseInt(m[1].replace(/,/g, ""), 10);
  const max = parseInt(m[2].replace(/,/g, ""), 10);
  return [min, max];
}

function parseVacancies(title: string, content: string): number {
  const titleMatch = title.match(/[–\-]\s*([\d,]+)\s*Vacanc/i);
  if (titleMatch) return parseInt(titleMatch[1].replace(/,/g, ""), 10);
  const contentMatch = content.match(/<td[^>]*>([\d,]+)<\/td>[\s\S]*?Vacanc/i);
  if (contentMatch) return parseInt(contentMatch[1].replace(/,/g, ""), 10);
  return 1;
}

function parseLastDate(content: string): string {
  const patterns = [
    /last date[^.]*?(?:is|:)\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    /apply (?:by|before|till|until)[^.]*?(\d{1,2}\s+\w+\s+\d{4})/i,
    /(\d{1,2}\s+\w+\s+\d{4})(?:[^.]*last date|[^.]*closing)/i,
  ];
  for (const re of patterns) {
    const m = content.replace(/<[^>]+>/g, " ").match(re);
    if (m) return m[1];
  }
  return "Check official notification";
}

function parseState(content: string, title: string): string {
  const indianStates: Record<string, string> = {
    "andhra pradesh": "Andhra Pradesh",
    assam: "Assam",
    bihar: "Bihar",
    "chhattisgarh": "Chhattisgarh",
    goa: "Goa",
    gujarat: "Gujarat",
    haryana: "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    jharkhand: "Jharkhand",
    karnataka: "Karnataka",
    kerala: "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    maharashtra: "Maharashtra",
    manipur: "Manipur",
    meghalaya: "Meghalaya",
    mizoram: "Mizoram",
    nagaland: "Nagaland",
    odisha: "Odisha",
    orissa: "Odisha",
    punjab: "Punjab",
    rajasthan: "Rajasthan",
    sikkim: "Sikkim",
    "tamil nadu": "Tamil Nadu",
    telangana: "Telangana",
    tripura: "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    uttarakhand: "Uttarakhand",
    "west bengal": "West Bengal",
    delhi: "Delhi",
    "jammu": "Jammu & Kashmir",
    kashmir: "Jammu & Kashmir",
    ladakh: "Ladakh",
    chandigarh: "Chandigarh",
    puducherry: "Puducherry",
    "andaman": "Andaman & Nicobar Islands",
    "lakshadweep": "Lakshadweep",
  };

  const text = (content.replace(/<[^>]+>/g, " ") + " " + title).toLowerCase();

  for (const [key, value] of Object.entries(indianStates)) {
    if (text.includes(key)) return value;
  }
  return "All India";
}

function classifyCategory(title: string, content: string): string {
  const t = title.toLowerCase();
  const c = content.toLowerCase();

  if (
    /railway|rrb|rrcs|rcf|dmrc|metro rail/.test(t) ||
    /railway|rrb/.test(c.slice(0, 500))
  )
    return "Railway Jobs";

  if (
    /police|defence|army|navy|air force|crpf|bsf|cisf|itbp|ssb|coast guard|agniveer|military|paramilitary|nda|cds|capf/.test(t)
  )
    return "Police/Defence Jobs";

  if (
    /bank|sbi|rbi|ibps|nabard|sidbi|exim bank|rrb bank|cooperative bank/.test(t)
  )
    return "Bank Jobs";

  if (
    /teacher|teaching|tgt|pgt|prt|professor|lecturer|faculty|school|college|university|education dept|nvs|kvs|sainik school/.test(t)
  )
    return "Teaching Jobs";

  if (
    /engineer|engineering|technical|ongc|bhel|sail|ntpc|bel|ecil|drdo|isro|hal|ordnance|technical officer/.test(t)
  )
    return "Engineering Jobs";

  const statePatterns = [
    /state government|state govt/i,
    /\b(ap|ts|ka|kl|mh|mp|up|rj|hr|pb|hp|jk|jh|wb|as|mn|ml|mz|nl|or|sk|tr|ga|cg|uk)\s+(govt|government|psc|ssc|recruitment|board)/i,
    /(andhra|telangana|karnataka|kerala|maharashtra|madhya pradesh|uttar pradesh|rajasthan|haryana|punjab|himachal|jharkhand|odisha|assam|bengal|gujarat|chhattisgarh|uttarakhand)\s+(?:govt|government|psc|ssc|recruitment)/i,
  ];
  for (const re of statePatterns) {
    if (re.test(t)) return "State Govt Jobs";
  }

  if (
    /upsc|ssc|central government|central govt|union public service|staff selection|ias|ips|ifs/.test(t)
  )
    return "All India Govt Jobs";

  return "All India Govt Jobs";
}

function extractOrganization(title: string): string {
  const m = title.match(/^(.+?)\s+Recruitment/i);
  if (m) return m[1].trim();
  const dash = title.indexOf("–");
  if (dash > 0) return title.slice(0, dash).trim();
  return title.split(" ").slice(0, 3).join(" ");
}

function slugToId(url: string): string {
  return (
    url
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\/$/, "")
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase() || url
  );
}

function itemToJob(item: RSSItem): JobItem {
  const plain = item.content.replace(/<[^>]+>/g, " ");

  const vacancyData = parseTableRow(item.content, [
    "postName",
    "vacancies",
    "salary",
    "location",
  ]);
  const eligibilityData = parseTableRow(item.content, [
    "postName",
    "eligibility",
    "experience",
  ]);

  const salaryRaw = vacancyData.salary || "";
  const [salaryMin, salaryMax] = parseSalary(salaryRaw);

  const state = parseState(vacancyData.location || plain, item.title);
  const district =
    vacancyData.location?.split(",")[0]?.trim() || "";

  const pubDate = new Date(item.pubDate);
  const isNew = Date.now() - pubDate.getTime() < 3 * 24 * 60 * 60 * 1000;

  const description = plain
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 400);

  return {
    id: slugToId(item.link),
    title: item.title,
    organization: extractOrganization(item.title),
    jobType: "Government",
    state,
    district,
    lastDate: parseLastDate(plain),
    vacancies: parseVacancies(item.title, item.content),
    qualification: eligibilityData.eligibility || vacancyData.postName || "See notification",
    salaryMin,
    salaryMax,
    applyUrl: item.link,
    description,
    eligibility: eligibilityData.eligibility || "",
    isNew,
    postedDate: pubDate.toISOString(),
    category: classifyCategory(item.title, item.content),
  };
}

async function fetchFeed(url: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 SarkariNaukri/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSItems(xml);
  } catch {
    return [];
  }
}

export async function fetchAllJobs(): Promise<JobItem[]> {
  const allFeeds = [...RSS_URLS, ...SEARCH_FEEDS];
  const results = await Promise.allSettled(allFeeds.map(fetchFeed));

  const seen = new Set<string>();
  const items: RSSItem[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seen.has(item.link)) {
          seen.add(item.link);
          items.push(item);
        }
      }
    }
  }

  return items.map(itemToJob).sort(
    (a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
  );
}
