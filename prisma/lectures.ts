/* Video courses made from lecture decks (lecture-video/). Added on every deploy if missing, never wiped:
   the owner's own edits to price, text and order in the admin app are kept. A chapter whose video is
   re-rendered gets its new video link, length and slides. */
import type { PrismaClient } from "@prisma/client";

type Q = [string, string[], number, string];
type Chapter = {
  title: string;
  lessons: (
    | { kind: "VIDEO"; title: string; video: string; seconds: number; slides?: [string, string]; preview?: boolean; notes: string }
    | { kind: "QUIZ"; title: string; questions: Q[] }
  )[];
};
type LectureCourse = {
  slug: string; title: string; subtitle: string; description: string; category: string; level: string;
  color: string; price: number; mrp: number; outcomes: string[]; requirements: string[]; tags: string; chapters: Chapter[];
};

export const LECTURE_COURSES: LectureCourse[] = [
  {
    slug: "battery-energy-storage-systems",
    title: "Battery Energy Storage Systems (BESS)",
    subtitle: "From the lithium-ion cell to a grid-scale plant: technology, parameters, modelling, tools, safety and economics",
    description:
      "A complete video course on battery energy storage for the power sector, taught chapter by chapter with narrated, annotated lectures.\n\n" +
      "We start with why grids need storage, go inside the cell, read every datasheet parameter exactly, build up the plant from cell to substation, " +
      "connect it to the grid, model it for control and for dispatch, enter it into PVsyst, HOMER, SAM and PLEXOS, and finish with testing, safety and bankability.\n\n" +
      "Every lecture has subtitles, a choice of video quality, and the chapter's slides to download.",
    category: "Grid & Markets",
    level: "Intermediate",
    color: "#1d4ed8",
    price: 299900,
    mrp: 599900,
    outcomes: [
      "Quote and question any BESS as power / energy and duration",
      "Explain the grid services a battery can sell, from milliseconds to hours",
      "Read cell and container datasheets and know where each number is measured",
      "Model batteries for control, ageing and energy dispatch",
      "Enter a battery consistently into PVsyst, HOMER, SAM and PLEXOS",
      "Judge safety, warranties and the economics of a BESS project",
    ],
    requirements: ["Basic electrical concepts (power, energy, voltage, current)", "No prior battery knowledge needed"],
    tags: "BESS,battery,storage,lithium-ion,LFP,grid",
    chapters: [
      {
        title: "Chapter 1: Why grids need storage",
        lessons: [
          {
            kind: "VIDEO",
            title: "Why grids need storage",
            video: "/media/lectures/bess/ch01/master.m3u8",
            seconds: 600,
            slides: ["/media/lectures/bess/ch01/BESS-Chapter-1-Why-grids-need-storage.pdf", "Chapter 1 slides (PDF)"],
            preview: true,
            notes:
              "### In this lecture\n\n" +
              "- **Power and energy:** power (MW) is how fast, energy (MWh) is how much; duration = energy ÷ power.\n" +
              "- **The duck curve:** solar creates a midday surplus and a steep evening ramp; a battery shifts the energy.\n" +
              "- **Services:** from fast frequency response in milliseconds to capacity over hours, and revenue stacking.\n" +
              "- **Where storage sits:** generation side, transmission, distribution, commercial and industrial, homes.\n" +
              "- **Technology comparison:** the Ragone plot and why lithium-ion (LFP) dominates from 0.5 to 8 hours.\n\n" +
              "> Always quote a BESS as power / energy, for example 100 MW / 400 MWh (a 4-hour system).",
          },
          {
            kind: "QUIZ",
            title: "Quiz: Why grids need storage",
            questions: [
              ["A plant is rated 100 MW / 400 MWh. What is its duration at full power?", ["1 hour", "2 hours", "4 hours", "40 hours"], 2, "Duration = energy ÷ power = 400 MWh ÷ 100 MW = 4 hours."],
              ["In a battery plant, the power rating is set mainly by…", ["The number of cells", "The inverters (power conversion system)", "The size of the container", "The grid frequency"], 1, "Power is set mostly by the power conversion system; energy mostly by the number of cells."],
              ["On the duck curve, when does a battery usually charge?", ["During the evening peak", "At midday, when solar is plentiful", "Only at night", "During grid faults"], 1, "It charges from the midday solar surplus and discharges into the evening peak."],
              ["Which service needs the fastest response from a battery?", ["Energy arbitrage", "Capacity / adequacy", "Fast frequency response / synthetic inertia", "Seasonal storage"], 2, "Fast frequency response acts within milliseconds to about a second."],
              ["A battery at a factory that cuts its peak demand charge sits…", ["Front of the meter", "Behind the meter", "On the transmission grid", "At the generation side"], 1, "Anything on the customer's side of the revenue meter is behind the meter."],
              ["Why does the vanadium flow battery look poor on a Ragone plot?", ["It is unsafe", "The plot is per kilogram, and weight hardly matters for a stationary plant", "It cannot discharge", "It has the lowest efficiency of all"], 1, "Its strengths, cheap added energy and long life, do not show on a per-kilogram chart."],
            ],
          },
        ],
      },
    ],
  },
];

export async function ensureLectureCourses(db: PrismaClient) {
  for (const c of LECTURE_COURSES) {
    let course = await db.course.findUnique({ where: { slug: c.slug } });
    if (!course) {
      const cat = (await db.category.findUnique({ where: { name: c.category } })) ??
        (await db.category.create({ data: { name: c.category, slug: c.category.toLowerCase().replace(/[^a-z]+/g, "-"), icon: "activity" } }));
      course = await db.course.create({
        data: {
          slug: c.slug, title: c.title, subtitle: c.subtitle, description: c.description, level: c.level, categoryId: cat.id,
          instructorName: "Power Sector Academy", instructorTitle: "Faculty, Power Sector Academy", coverColor: c.color,
          priceInPaise: c.price, mrpInPaise: c.mrp, outcomes: JSON.stringify(c.outcomes), requirements: JSON.stringify(c.requirements),
          tags: c.tags, published: true, featured: true,
        },
      });
      console.log(`Added video course: ${c.title}`);
    }
    for (const [ci, ch] of c.chapters.entries()) {
      const mod = (await db.module.findFirst({ where: { courseId: course.id, title: ch.title } })) ??
        (await db.module.create({ data: { courseId: course.id, title: ch.title, order: ci } }));
      for (const [li, l] of ch.lessons.entries()) {
        const found = await db.lesson.findFirst({ where: { moduleId: mod.id, title: l.title } });
        if (l.kind === "VIDEO") {
          const media = { videoUrl: l.video, durationSec: l.seconds, resourceUrl: l.slides?.[0] ?? null, resourceName: l.slides?.[1] ?? null };
          if (found) await db.lesson.update({ where: { id: found.id }, data: media });
          else await db.lesson.create({ data: { moduleId: mod.id, title: l.title, type: "VIDEO", order: li, isPreview: !!l.preview, content: l.notes, ...media } });
        } else if (!found) {
          const lesson = await db.lesson.create({ data: { moduleId: mod.id, title: l.title, type: "QUIZ", order: li, durationSec: l.questions.length * 90 } });
          await db.quiz.create({ data: { lessonId: lesson.id, passPercent: 60, timeLimitSec: l.questions.length * 90,
            questions: { create: l.questions.map(([text, options, correctIndex, explanation], order) => ({ text, options: JSON.stringify(options), correctIndex, explanation, order })) } } });
        }
      }
    }
  }
}
