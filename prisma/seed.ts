/* Seeds demo content: power sector courses, quizzes, plans, bundles, coupons and demo users.
   Videos point at public sample clips; replace them with your own lecture recordings in the admin panel. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const V = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
];
let vi = 0;
const video = () => V[vi++ % V.length];

type Q = [string, string[], number, string];
type L =
  | { t: "VIDEO"; title: string; min: number; notes?: string; preview?: boolean }
  | { t: "READING"; title: string; min: number; md: string }
  | { t: "QUIZ"; title: string; qs: Q[] };
type C = {
  slug: string; title: string; subtitle: string; description: string; level: string; cat: string;
  instructor: string; instructorTitle: string; color: string; price: number; mrp: number; featured?: boolean;
  outcomes: string[]; requirements: string[]; tags: string; modules: { title: string; lessons: L[] }[];
};

const courses: C[] = [
  {
    slug: "power-system-fundamentals",
    title: "Power System Fundamentals",
    subtitle: "Generation, transmission and distribution explained from first principles",
    description:
      "A complete foundation in how electricity reaches consumers. You will learn AC power concepts, per-unit systems, the structure of the Indian grid, load curves and the economics of generation. Ideal for graduate engineers, new joiners at utilities and anyone moving into the power sector.",
    level: "Beginner", cat: "Power Systems", instructor: "Dr. Meera Rao", instructorTitle: "Former Chief Engineer, State Transmission Utility",
    color: "#0f766e", price: 0, mrp: 0, featured: true,
    outcomes: ["Explain active, reactive and apparent power and power factor", "Solve problems using the per-unit system", "Describe the structure of the Indian national grid", "Read load curves and calculate load and capacity factors"],
    requirements: ["Basic electrical engineering (Ohm's law, AC circuits)"],
    tags: "basics,grid,ac power,per unit",
    modules: [
      { title: "AC power essentials", lessons: [
        { t: "VIDEO", title: "Welcome and how the course works", min: 4, preview: true },
        { t: "VIDEO", title: "Active, reactive and apparent power", min: 14, preview: true },
        { t: "READING", title: "Study notes: the power triangle", min: 10, md: `# The power triangle

In an AC circuit, voltage and current are not always in phase. This gives three related quantities:

- **Active power (P)**, measured in watts (W). This is the power that does useful work.
- **Reactive power (Q)**, measured in volt-ampere reactive (VAr). It is exchanged between source and the magnetic or electric fields of the load.
- **Apparent power (S)**, measured in volt-amperes (VA). It is the product of RMS voltage and current.

These form a right-angled triangle: **S² = P² + Q²**.

## Power factor

Power factor is **cos φ = P / S**. A low power factor means more current flows for the same useful power, which increases losses (I²R) and requires larger conductors and transformers.

| Load type | Typical power factor |
|---|---|
| Incandescent lamp | 1.0 |
| Induction motor, full load | 0.85 |
| Induction motor, light load | 0.4 to 0.6 |
| Arc furnace | 0.7 to 0.85 |

## Worked example

A 400 V three-phase motor draws 50 A at 0.8 power factor lagging.

- S = √3 × 400 × 50 = 34.6 kVA
- P = S × 0.8 = 27.7 kW
- Q = S × sin φ = 34.6 × 0.6 = 20.8 kVAr

> **Key takeaway:** utilities penalise low power factor because reactive current loads the network without delivering energy that can be billed.` },
        { t: "QUIZ", title: "Quiz: AC power", qs: [
          ["Which quantity is measured in VAr?", ["Active power", "Reactive power", "Apparent power", "Energy"], 1, "Reactive power is measured in volt-ampere reactive (VAr)."],
          ["If P = 80 kW and S = 100 kVA, what is the power factor?", ["0.6", "0.8", "1.25", "0.2"], 1, "Power factor = P/S = 80/100 = 0.8."],
          ["A low power factor mainly increases", ["Line current and losses", "Frequency", "Voltage rating", "Number of phases"], 0, "For the same active power, a lower power factor needs more current, raising I²R losses."],
          ["S² equals", ["P + Q", "P² − Q²", "P² + Q²", "P × Q"], 2, "Apparent, active and reactive power form a right triangle."],
        ] },
      ] },
      { title: "The per-unit system", lessons: [
        { t: "VIDEO", title: "Why engineers use per-unit values", min: 12 },
        { t: "READING", title: "Study notes: base values and conversions", min: 8, md: `# Per-unit system

A per-unit (pu) value is the actual value divided by a chosen base value.

**Choose two bases**, usually MVA and kV. The others follow:

- Base current: I_base = MVA_base / (√3 × kV_base)
- Base impedance: Z_base = kV_base² / MVA_base

## Changing base

Z_pu(new) = Z_pu(old) × (kV_old / kV_new)² × (MVA_new / MVA_old)

## Why it helps

1. Transformer impedances look the same from both sides.
2. Equipment values fall in a narrow, familiar range.
3. Calculations for networks with many voltage levels become simple.` },
        { t: "QUIZ", title: "Quiz: per-unit", qs: [
          ["Base impedance on a 100 MVA, 220 kV base is", ["484 Ω", "2.2 Ω", "48.4 Ω", "220 Ω"], 0, "Z_base = 220² / 100 = 484 Ω."],
          ["A major advantage of per-unit is that", ["Transformer impedance is the same on both sides", "Losses disappear", "Frequency is normalised", "Power factor becomes 1"], 0, "With consistent bases the turns ratio drops out."],
          ["Which two base quantities are usually chosen?", ["Current and impedance", "MVA and kV", "kW and kVAr", "Hz and kV"], 1, "MVA and kV bases are chosen; others are derived."],
        ] },
      ] },
      { title: "The Indian grid", lessons: [
        { t: "VIDEO", title: "One Nation One Grid: how India became synchronous", min: 16 },
        { t: "READING", title: "Study notes: load curves and key factors", min: 10, md: `# Load curves and key factors

A **load curve** plots demand against time. The area under it is energy consumed.

- **Load factor** = average load ÷ peak load
- **Capacity factor** = actual energy ÷ (rated capacity × hours)
- **Diversity factor** = sum of individual maximum demands ÷ maximum demand of the group

## Indian grid in brief

- Five regional grids (Northern, Western, Southern, Eastern, North-Eastern) are synchronised as one national grid at 50 Hz since December 2013.
- Grid operation is coordinated by Grid Controller of India (Grid-India) through NLDC, RLDCs and SLDCs.
- The Indian Electricity Grid Code sets the operating band of 49.90 to 50.05 Hz.` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["Load factor is defined as", ["Peak ÷ average load", "Average ÷ peak load", "Energy ÷ capacity", "Sum of demands ÷ group demand"], 1, "Load factor = average load / peak load."],
          ["India's national grid frequency is", ["60 Hz", "50 Hz", "45 Hz", "55 Hz"], 1, "India operates at a nominal 50 Hz."],
          ["Which body runs national grid operations in India?", ["CEA", "Grid-India (NLDC)", "CERC", "BEE"], 1, "Grid-India operates NLDC and the RLDCs."],
          ["A generator of 100 MW producing 438 GWh in a year has a capacity factor of", ["50%", "25%", "75%", "100%"], 0, "438,000 MWh ÷ (100 × 8760) = 0.5."],
          ["Diversity factor is always", ["Less than 1", "Equal to 1", "Greater than or equal to 1", "Negative"], 2, "Individual peaks do not all coincide, so the ratio is ≥ 1."],
        ] },
      ] },
    ],
  },
  {
    slug: "grid-operations-and-scheduling",
    title: "Grid Operations, Scheduling and DSM",
    subtitle: "Master scheduling, deviation settlement and frequency control in Indian grid operations",
    description:
      "Learn how load despatch centres balance supply and demand every 15 minutes. Covers the Indian Electricity Grid Code, day-ahead and real-time scheduling, the Deviation Settlement Mechanism, ancillary services and frequency response. Built for SLDC and RLDC engineers, discom power-purchase teams and generators.",
    level: "Intermediate", cat: "Grid & Markets", instructor: "Ankit Sharma", instructorTitle: "Power Systems & Grid Operations Specialist",
    color: "#1d4ed8", price: 499900, mrp: 899900, featured: true,
    outcomes: ["Prepare and revise schedules in 15-minute time blocks", "Compute deviation charges under DSM regulations", "Explain primary, secondary and tertiary frequency control", "Interpret grid frequency and ACE data"],
    requirements: ["Power System Fundamentals or equivalent experience"],
    tags: "dsm,scheduling,iegc,sldc,rldc,frequency,ancillary",
    modules: [
      { title: "Scheduling and despatch", lessons: [
        { t: "VIDEO", title: "Roles of NLDC, RLDC and SLDC", min: 15, preview: true },
        { t: "VIDEO", title: "Day-ahead scheduling in 96 time blocks", min: 18 },
        { t: "READING", title: "Study notes: scheduling timeline", min: 12, md: `# Scheduling timeline

The day is split into **96 time blocks of 15 minutes**.

1. Generators declare availability (DC) for the next day.
2. Beneficiaries submit requisitions against their entitlements.
3. The RLDC issues the day-ahead schedule.
4. Revisions are allowed during the day, effective from the 4th time block after the request (as per the applicable Grid Code).

## Key terms

| Term | Meaning |
|---|---|
| DC | Declared capacity of a generating station |
| Entitlement | Share of a beneficiary in a station |
| Requisition | Power the beneficiary asks for in a time block |
| URS | Un-requisitioned surplus available for others |` },
        { t: "QUIZ", title: "Quiz: scheduling", qs: [
          ["How many time blocks are in a scheduling day?", ["24", "48", "96", "144"], 2, "24 hours × 4 blocks of 15 minutes = 96."],
          ["URS stands for", ["Unscheduled Regional Supply", "Un-Requisitioned Surplus", "Unified Reserve Share", "Unit Run Status"], 1, "Capacity a beneficiary has not requisitioned."],
          ["Which centre issues regional schedules?", ["SLDC", "RLDC", "CEA", "Power exchange"], 1, "RLDCs issue schedules for inter-state entities in their region."],
        ] },
      ] },
      { title: "Deviation Settlement Mechanism", lessons: [
        { t: "VIDEO", title: "Why deviations are priced", min: 14 },
        { t: "READING", title: "Study notes: computing deviation charges", min: 15, md: `# Computing deviation charges

**Deviation = Actual injection or drawal − Scheduled value** for each time block.

Under the CERC DSM regulations, the normal rate of charges for deviation is linked to the market price discovered on the power exchanges and ancillary services prices, with additional charges when deviations exceed set volume limits.

## Steps for one time block

1. Read meter data (SEM) for the block, in MWh.
2. Subtract the final implemented schedule.
3. Classify: over-injection or under-drawal (positive), under-injection or over-drawal (negative).
4. Apply the rate and volume limits for the entity category.
5. Sum all blocks in the week for the DSM account.

> Always confirm the rates and limits in the regulation version in force for the settlement week, because they have been amended several times.` },
        { t: "VIDEO", title: "Worked example: a week of DSM for a state", min: 22 },
        { t: "QUIZ", title: "Quiz: DSM", qs: [
          ["Deviation for a block is", ["Schedule − capacity", "Actual − schedule", "Peak − average", "Entitlement − requisition"], 1, "Deviation compares actual metered energy against the schedule."],
          ["DSM accounts are typically settled", ["Daily", "Weekly", "Monthly", "Yearly"], 1, "DSM pool accounts are prepared weekly."],
          ["Over-drawal by a discom is a", ["Positive deviation", "Negative deviation", "Zero deviation", "Schedule revision"], 1, "Drawing more than scheduled is a negative deviation for the drawee."],
        ] },
      ] },
      { title: "Frequency control and ancillary services", lessons: [
        { t: "VIDEO", title: "Primary, secondary and tertiary control", min: 17 },
        { t: "READING", title: "Study notes: AGC and reserves", min: 10, md: `# AGC and reserves

- **Primary response** acts in seconds through governor droop.
- **Secondary control** (AGC) restores frequency and interchange within minutes using the Area Control Error.
- **Tertiary control** replaces secondary reserves and is despatched by the system operator.

**ACE = (Actual interchange − Scheduled interchange) − 10 × B × (Actual frequency − 50)**, where B is the frequency response characteristic (negative MW/0.1 Hz).` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["Governor droop provides", ["Primary response", "Secondary control", "Tertiary control", "Black start"], 0, "Primary response is the automatic governor action."],
          ["AGC acts on", ["Voltage error", "Area Control Error", "Load factor", "Power factor"], 1, "AGC minimises ACE."],
          ["Tertiary reserves are used to", ["Replace secondary reserves", "Start generators from black", "Correct voltage", "Meter energy"], 0, "Tertiary reserves free up secondary reserves."],
          ["IEGC normal frequency band upper limit is", ["50.05 Hz", "50.5 Hz", "51 Hz", "50.2 Hz"], 0, "The band is 49.90 to 50.05 Hz."],
        ] },
      ] },
    ],
  },
  {
    slug: "renewable-integration",
    title: "Renewable Energy Integration and Storage",
    subtitle: "Solar, wind, forecasting and battery storage for a 500 GW grid",
    description:
      "Understand the technical and commercial challenges of integrating large-scale solar and wind. Covers resource assessment, forecasting and scheduling of RE, curtailment, hybrid and round-the-clock projects, and battery energy storage system design.",
    level: "Intermediate", cat: "Renewables", instructor: "Priya Nair", instructorTitle: "Head of RE Analytics",
    color: "#ca8a04", price: 599900, mrp: 999900, featured: true,
    outcomes: ["Estimate energy yield for a solar plant", "Explain RE forecasting and its scheduling impact", "Size a battery for peak shifting", "Evaluate hybrid and RTC power structures"],
    requirements: ["Basic understanding of power systems"],
    tags: "solar,wind,bess,storage,forecasting,hybrid,rtc",
    modules: [
      { title: "Solar and wind resources", lessons: [
        { t: "VIDEO", title: "Solar irradiance, CUF and yield", min: 16, preview: true },
        { t: "READING", title: "Study notes: estimating solar energy yield", min: 10, md: `# Estimating solar yield

**Annual energy (MWh) ≈ Capacity (MWp) × Peak sun hours per day × 365 × Performance ratio**

Example: 50 MWp in Rajasthan, 5.5 peak sun hours, PR 0.78 → 50 × 5.5 × 365 × 0.78 ≈ 78,300 MWh.

**CUF** = annual energy ÷ (AC capacity × 8760). Typical fixed-tilt CUF in India is 19% to 22%; single-axis trackers reach 24% to 27%.` },
        { t: "VIDEO", title: "Wind resource and power curves", min: 14 },
        { t: "QUIZ", title: "Quiz: resources", qs: [
          ["CUF is calculated using", ["8760 hours", "365 hours", "24 hours", "720 hours"], 0, "CUF uses all hours in a year."],
          ["Trackers increase CUF because they", ["Follow the sun", "Reduce temperature", "Add inverters", "Lower DC/AC ratio"], 0, "Single-axis trackers follow the sun's path."],
          ["Wind power varies with wind speed to the power of", ["1", "2", "3", "4"], 2, "P = ½ρAv³."],
        ] },
      ] },
      { title: "Storage and hybrids", lessons: [
        { t: "VIDEO", title: "Battery energy storage: chemistry to grid services", min: 19 },
        { t: "READING", title: "Study notes: sizing a BESS", min: 12, md: `# Sizing a BESS

- **Power rating (MW)** sets how fast it charges or discharges.
- **Energy rating (MWh)** sets how long it can deliver.
- Duration = MWh ÷ MW.

To shift 100 MW of solar for a 4-hour evening peak with 88% round-trip efficiency and 90% usable depth of discharge:

Energy needed = 100 × 4 ÷ 0.9 ≈ 445 MWh installed. Charging energy ≈ 400 ÷ 0.88 ≈ 455 MWh of solar.` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["A 50 MW / 200 MWh battery has a duration of", ["2 h", "4 h", "0.25 h", "10 h"], 1, "200 ÷ 50 = 4 hours."],
          ["Round-trip efficiency of lithium-ion BESS is typically", ["50%", "70%", "85% to 90%", "99%"], 2, "Modern Li-ion systems achieve about 85% to 90%."],
          ["RTC renewable power aims to provide", ["Only daytime power", "Round-the-clock supply", "Reactive power only", "Black start"], 1, "RTC combines RE, storage and sometimes thermal to supply all day."],
        ] },
      ] },
    ],
  },
  {
    slug: "electricity-markets-and-trading",
    title: "Electricity Markets and Power Trading",
    subtitle: "Power exchanges, bilateral contracts, RECs and price discovery",
    description:
      "How electricity is bought and sold in India: long-term PPAs, short-term bilateral trades, Day-Ahead, Real-Time and Term-Ahead markets on power exchanges, Green markets and Renewable Energy Certificates. Includes bidding strategy and market coupling.",
    level: "Advanced", cat: "Grid & Markets", instructor: "Rahul Verma", instructorTitle: "Former Power Trader, Exchange Member",
    color: "#7c3aed", price: 699900, mrp: 1199900,
    outcomes: ["Compare PPA, bilateral and exchange procurement", "Construct and read aggregate bid curves", "Explain market clearing price and volume", "Use RECs and green markets for RPO compliance"],
    requirements: ["Grid Operations course recommended"],
    tags: "iex,dam,rtm,trading,ppa,rec,market",
    modules: [
      { title: "Market design", lessons: [
        { t: "VIDEO", title: "Market segments in India", min: 15, preview: true },
        { t: "READING", title: "Study notes: double-sided auction", min: 10, md: `# Double-sided closed auction

Buyers submit price-quantity bids; sellers submit offers. The exchange builds aggregate demand and supply curves for each time block. Their intersection gives the **Market Clearing Price (MCP)** and **Market Clearing Volume (MCV)**.

If transmission corridors are congested, the market splits into areas with different **Area Clearing Prices**.` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["MCP is found where", ["Demand and supply curves intersect", "Demand peaks", "Supply is lowest", "Frequency is 50 Hz"], 0, "Clearing price is at the intersection."],
          ["Market splitting happens due to", ["Transmission congestion", "Low demand", "Holidays", "Metering errors"], 0, "Congestion creates price areas."],
          ["RTM on Indian exchanges clears in", ["Hourly blocks", "Half-hourly sessions for 15-minute blocks", "Daily blocks", "Weekly blocks"], 1, "RTM runs 48 sessions a day for 15-minute delivery blocks."],
        ] },
      ] },
    ],
  },
  {
    slug: "substation-and-transmission",
    title: "Substation and Transmission Engineering",
    subtitle: "Design, protection and maintenance of EHV substations and lines",
    description:
      "A practical course for field and design engineers: substation layouts and bus schemes, transformers, circuit breakers, protection philosophy, line design, earthing and condition monitoring.",
    level: "Intermediate", cat: "Power Systems", instructor: "Er. Suresh Kumar", instructorTitle: "Senior Manager, Transmission O&M",
    color: "#be123c", price: 549900, mrp: 899900,
    outcomes: ["Choose bus schemes for reliability", "Explain distance and differential protection", "Plan substation earthing", "Read transformer test reports"],
    requirements: ["Power System Fundamentals"],
    tags: "substation,protection,transformer,transmission,earthing",
    modules: [
      { title: "Substation design", lessons: [
        { t: "VIDEO", title: "Bus schemes: single, double and one-and-a-half breaker", min: 18, preview: true },
        { t: "READING", title: "Study notes: protection zones", min: 10, md: `# Protection zones

Each element (generator, transformer, bus, line) has its own zone, and zones overlap at circuit breakers so no part is unprotected.

- **Differential protection** compares currents entering and leaving a zone.
- **Distance protection** measures impedance to the fault; Zone 1 typically covers 80% of the line instantaneously.
- **Overcurrent** is used as backup.` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["Zone 1 of distance protection typically covers", ["50%", "80%", "120%", "200%"], 1, "About 80% to avoid overreach."],
          ["Differential protection operates on", ["Current difference", "Voltage magnitude", "Frequency", "Temperature"], 0, "It compares in and out currents."],
          ["One-and-a-half breaker scheme uses", ["3 breakers for 2 circuits", "1 breaker per circuit", "2 breakers per circuit", "No breakers"], 0, "Three breakers serve two circuits."],
        ] },
      ] },
    ],
  },
  {
    slug: "regulation-and-tariff",
    title: "Electricity Regulation and Tariff Design",
    subtitle: "Electricity Act, regulators, ARR, tariff orders and consumer tariffs",
    description:
      "Understand the legal and regulatory framework of the Indian power sector, how Aggregate Revenue Requirement is built, how tariff orders are made, and how cross-subsidy, open access and time-of-day tariffs work.",
    level: "Advanced", cat: "Policy & Regulation", instructor: "Adv. Kavita Menon", instructorTitle: "Regulatory Affairs Consultant",
    color: "#334155", price: 449900, mrp: 799900,
    outcomes: ["Explain the roles of CERC, SERCs and APTEL", "Build an Aggregate Revenue Requirement", "Compute cross-subsidy surcharge", "Design time-of-day tariffs"],
    requirements: ["None"],
    tags: "tariff,regulation,cerc,serc,arr,open access",
    modules: [
      { title: "Framework", lessons: [
        { t: "VIDEO", title: "The Electricity Act 2003 in one hour", min: 20, preview: true },
        { t: "READING", title: "Study notes: ARR building blocks", min: 12, md: `# Aggregate Revenue Requirement

ARR is the total revenue a utility is allowed to recover in a year:

**ARR = Power purchase cost + Transmission charges + O&M + Depreciation + Interest on loans + Interest on working capital + Return on equity − Non-tariff income**

Power purchase cost is typically 70% to 80% of a discom's ARR.` },
        { t: "QUIZ", title: "Final assessment", qs: [
          ["The largest component of discom ARR is usually", ["Power purchase cost", "O&M", "Depreciation", "Return on equity"], 0, "Power purchase dominates discom costs."],
          ["Appeals against CERC orders go to", ["APTEL", "CEA", "SERC", "NITI Aayog"], 0, "The Appellate Tribunal for Electricity hears appeals."],
          ["Cross-subsidy surcharge is paid by", ["Open access consumers", "Generators", "Traders only", "Transmission utilities"], 0, "It compensates the discom for lost cross-subsidy."],
        ] },
      ] },
    ],
  },
];

async function main() {
  await db.$transaction([
    db.comment.deleteMany(), db.note.deleteMany(), db.review.deleteMany(), db.certificate.deleteMany(),
    db.quizAttempt.deleteMany(), db.dailyActivity.deleteMany(), db.lessonProgress.deleteMany(),
    db.enrollment.deleteMany(), db.order.deleteMany(), db.subscription.deleteMany(), db.bundleCourse.deleteMany(),
    db.bundle.deleteMany(), db.plan.deleteMany(), db.coupon.deleteMany(), db.course.deleteMany(),
    db.category.deleteMany(), db.announcement.deleteMany(), db.user.deleteMany(),
  ]);

  const cats = ["Power Systems", "Grid & Markets", "Renewables", "Policy & Regulation"];
  const catIcons = ["zap", "activity", "sun", "scale"];
  const catIds: Record<string, string> = {};
  for (const [i, name] of cats.entries()) {
    const c = await db.category.create({ data: { name, slug: name.toLowerCase().replace(/[^a-z]+/g, "-"), icon: catIcons[i] } });
    catIds[name] = c.id;
  }

  const ids: Record<string, string> = {};
  for (const c of courses) {
    const course = await db.course.create({
      data: {
        slug: c.slug, title: c.title, subtitle: c.subtitle, description: c.description, level: c.level,
        categoryId: catIds[c.cat], instructorName: c.instructor, instructorTitle: c.instructorTitle, coverColor: c.color,
        priceInPaise: c.price, mrpInPaise: c.mrp, outcomes: JSON.stringify(c.outcomes), requirements: JSON.stringify(c.requirements),
        tags: c.tags, published: true, featured: !!c.featured,
      },
    });
    ids[c.slug] = course.id;
    for (const [mi, m] of c.modules.entries()) {
      const mod = await db.module.create({ data: { courseId: course.id, title: m.title, order: mi } });
      for (const [li, l] of m.lessons.entries()) {
        const base = { moduleId: mod.id, title: l.title, type: l.t, order: li };
        if (l.t === "VIDEO") {
          await db.lesson.create({ data: { ...base, videoUrl: video(), durationSec: l.min * 60, isPreview: !!l.preview,
            content: `### About this lecture\n\nLecture notes and slides for **${l.title}**. Replace this video with your own recording from the admin panel.` } });
        } else if (l.t === "READING") {
          await db.lesson.create({ data: { ...base, content: l.md, durationSec: l.min * 60 } });
        } else {
          const lesson = await db.lesson.create({ data: { ...base, durationSec: l.qs.length * 90 } });
          await db.quiz.create({ data: { lessonId: lesson.id, passPercent: 60, timeLimitSec: l.qs.length * 90,
            questions: { create: l.qs.map(([text, options, correctIndex, explanation], order) => ({ text, options: JSON.stringify(options), correctIndex, explanation, order })) } } });
        }
      }
    }
  }

  const b1 = await db.bundle.create({ data: { slug: "grid-professional", title: "Grid Professional Track",
    description: "Grid operations, markets and regulation: everything a load despatch or power-purchase engineer needs.",
    priceInPaise: 1299900, mrpInPaise: 1649700,
    courses: { create: [ids["grid-operations-and-scheduling"], ids["electricity-markets-and-trading"], ids["regulation-and-tariff"]].map((courseId) => ({ courseId })) } } });
  await db.bundle.create({ data: { slug: "clean-energy-engineer", title: "Clean Energy Engineer Track",
    description: "Renewables, storage and transmission for engineers building India's energy transition.",
    priceInPaise: 949900, mrpInPaise: 1149800,
    courses: { create: [ids["renewable-integration"], ids["substation-and-transmission"]].map((courseId) => ({ courseId })) } } });

  await db.plan.createMany({ data: [
    { name: "Monthly", description: "Full access, billed every month", interval: "MONTH", priceInPaise: 99900,
      features: JSON.stringify(["All courses and future courses", "Certificates on completion", "Downloadable study material", "Cancel anytime"]) },
    { name: "Annual", description: "Best value for working professionals", interval: "YEAR", priceInPaise: 799900, highlight: true,
      features: JSON.stringify(["Everything in Monthly", "Save 33% vs monthly", "Priority doubt support", "Live webinar access"]) },
  ] });

  await db.coupon.createMany({ data: [
    { code: "LAUNCH50", description: "Launch offer: 50% off any course or bundle", kind: "PERCENT", value: 50, maxDiscount: 500000, perUserLimit: 1 },
    { code: "GRID1000", description: "₹1,000 off the Grid Professional Track", kind: "FLAT", value: 100000, appliesTo: "BUNDLE", targetId: b1.id },
    { code: "STUDENT20", description: "20% off for students", kind: "PERCENT", value: 20, maxRedemptions: 500 },
  ] });

  const pw = await bcrypt.hash("admin123", 10);
  await db.user.create({ data: { name: "Admin", email: "admin@poweracademy.in", phone: "+919999999999", passwordHash: pw, role: "ADMIN" } });
  const learner = await db.user.create({ data: { name: "Riya Gupta", email: "learner@poweracademy.in", phone: "+919888888888",
    passwordHash: await bcrypt.hash("learner123", 10), organization: "State Load Despatch Centre", designation: "Assistant Engineer", city: "Jaipur" } });

  // Demo learning history so the dashboard has something to show.
  const fundamentals = ids["power-system-fundamentals"];
  await db.enrollment.create({ data: { userId: learner.id, courseId: fundamentals, source: "FREE" } });
  await db.enrollment.create({ data: { userId: learner.id, courseId: ids["grid-operations-and-scheduling"], source: "PURCHASE" } });
  const lessons = await db.lesson.findMany({ where: { module: { courseId: fundamentals } }, orderBy: [{ module: { order: "asc" } }, { order: "asc" }], take: 5, include: { quiz: true } });
  for (const l of lessons) {
    await db.lessonProgress.create({ data: { userId: learner.id, lessonId: l.id, completed: true, watchedSeconds: l.durationSec } });
    if (l.quiz) await db.quizAttempt.create({ data: { userId: learner.id, quizId: l.quiz.id, score: 3, total: 4, percent: 75, passed: true, answers: "[]" } });
  }
  for (let i = 0; i < 21; i++) {
    if (i % 5 === 3) continue;
    const d = new Date(Date.now() - i * 86400_000 + 5.5 * 3600_000).toISOString().slice(0, 10);
    await db.dailyActivity.create({ data: { userId: learner.id, day: d, seconds: 900 + ((i * 731) % 2700) } });
  }
  await db.review.create({ data: { userId: learner.id, courseId: fundamentals, rating: 5, comment: "Clear explanations and the per-unit notes are excellent." } });
  await db.announcement.create({ data: { title: "Welcome to Power Academy", body: "New course on Electricity Markets is live. Use code LAUNCH50 for 50% off this month." } });
  console.log("Seeded.");
}

main().finally(() => db.$disconnect());
