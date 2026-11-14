// Instant In-Memory College Knowledge Engine for Zero-Latency Chat Responses

export interface QAEntry {
  topics: string[];
  keywords: string[];
  answer: string;
}

export const COLLEGE_DATA = {
  name: "EduReach College",
  tagline: "Premier Engineering & Technology Institution",
  established: 2005,
  location: "Hyderabad, Telangana, India",
  affiliation: "Affiliated with JNTU Hyderabad and approved by AICTE, New Delhi",
  campus: "25-acre green campus with smart classrooms, 12 advanced labs, high-speed Wi-Fi, central library, sports complex, and on-campus hostels",
  placementRate: "92%",
  highestPackage: "₹42 LPA (Google)",
  contact: {
    phone: "+91 9876543210",
    email: "admissions@edureach.edu.in",
    generalEmail: "info@edureach.edu.in",
    hours: "Monday to Saturday, 9:00 AM – 5:00 PM (open Sundays during admission season)",
  },
};

export const KNOWLEDGE_ENTRIES: QAEntry[] = [
  // 1. Courses & Programs
  {
    topics: ["courses", "programs", "branches", "degrees", "btech", "mtech", "mba"],
    keywords: ["course", "program", "branch", "btech", "b.tech", "mtech", "m.tech", "mba", "offer", "specialization", "curriculum"],
    answer: `EduReach College offers premier undergraduate and postgraduate programs:

🎓 **B.Tech Programs (4 Years):**
• Computer Science & Engineering (CSE) — **180 Seats**
• Artificial Intelligence & Data Science (AI & DS) — **60 Seats**
• Electronics & Communication Engineering (ECE) — **120 Seats**
• Information Technology (IT) — **120 Seats**
• Mechanical Engineering (ME) — **60 Seats**
• Civil Engineering (CE) — **60 Seats**
*(Includes mandatory internships in 6th & 7th semesters, plus specialized AI/ML and Cloud computing labs)*

🎓 **M.Tech Programs (2 Years):**
• Computer Science — 30 Seats
• VLSI Design — 18 Seats
• Structural Engineering — 18 Seats

🎓 **MBA Program (2 Years):**
• Specializations in Finance, Marketing, HR, and IT — 60 Seats.`,
  },

  // 2. Fee Structure
  {
    topics: ["fees", "fee structure", "tuition", "cost", "hostel fee"],
    keywords: ["fee", "fees", "cost", "price", "tuition", "charge", "installment", "expense", "pay", "payment", "emi", "loan"],
    answer: `Here is the verified **Fee Structure for 2024–2025**:

💰 **B.Tech:**
• Tuition Fee: **₹1,50,000 / year**
• Lab & Exam Fee: **₹20,000 / year**
• **Day Scholar Total:** **₹1,70,000 / year**
• Hostel & Mess: **₹80,000 / year**
• **Hosteller Total:** **₹2,50,000 / year**

💰 **M.Tech:**
• Tuition Fee: ₹1,00,000 / year
• Hostel & Mess: ₹80,000 / year

💰 **MBA:**
• Tuition Fee: ₹2,00,000 / year
• Hostel & Mess: ₹80,000 / year

💳 **Payment & Loans:**
• Fees can be paid in **2 installments per year**.
• Direct education loan & EMI tie-ups with **SBI, HDFC, and ICICI Bank**.`,
  },

  // 3. Admissions & Eligibility
  {
    topics: ["admissions", "apply", "eligibility", "dates", "deadline", "counseling", "quota"],
    keywords: ["admission", "admissions", "apply", "eligibility", "eligible", "eamcet", "icet", "gate", "management quota", "criteria", "cutoff", "process", "register"],
    answer: `Here is the complete **Admissions Process & Eligibility**:

📋 **B.Tech Admissions:**
• **70% Seats:** Allotted through **TS EAMCET / AP EAMCET** counseling.
• **30% Seats:** Management Quota (based on 10+2 PCM marks and interview).
• **Eligibility:** Minimum **60% marks in 10+2 (PCM)**. JEE Main rank holders are given special preference.

📋 **M.Tech Admissions:**
• 50% via **GATE** score + 50% via College Entrance Test.
• **Eligibility:** B.Tech / B.E. with minimum **60% aggregate**.

📋 **MBA Admissions:**
• 70% through **TS ICET** counseling + 30% Management quota.
• **Eligibility:** Bachelor’s degree with minimum **50% marks**.

📅 **Important Dates:**
• Applications Open: **March 1st**
• Management Quota Deadline: **July 15th**
• Odd Semester Classes Begin: **August 1st**`,
  },

  // 4. Placements & Recruiters
  {
    topics: ["placements", "jobs", "salary", "package", "recruiters", "companies", "highest package"],
    keywords: ["placement", "placements", "package", "salary", "lpa", "highest", "average", "company", "companies", "recruit", "recruiter", "google", "amazon", "microsoft"],
    answer: `EduReach College boasts an exceptional **92% Overall Placement Rate** for the 2023–2024 academic year:

🚀 **Package Highlights:**
• **Highest Package:** **₹42 LPA** (Offered by **Google**)
• **AI & DS Average:** **₹11.5 LPA** (100% placed!)
• **CSE Average:** **₹10.2 LPA** (95% placed)
• **IT Average:** **₹8.8 LPA** (90% placed)
• **MBA Average:** **₹8.0 LPA**
• **ECE Average:** **₹7.2 LPA** (85% placed)
• **Mechanical & Civil Average:** ₹5.0 – ₹5.5 LPA

🏢 **Top Visiting Recruiters (150+ Companies):**
Google, Microsoft, Amazon, Flipkart, Razorpay, CRED, PhonePe, Deloitte, Accenture, TCS, Infosys, Wipro, L&T, Bosch, EY, and KPMG.
Over **850+ total job offers** were extended to our graduates!`,
  },

  // 5. Scholarships
  {
    topics: ["scholarships", "financial aid", "waiver", "discount"],
    keywords: ["scholarship", "scholarships", "waiver", "concession", "financial aid", "merit", "sports quota", "sc", "st", "obc"],
    answer: `EduReach College provides generous scholarship opportunities:

🌟 **Merit Scholarship:**
Top 10 rankers in the entrance exam receive a **50% tuition fee waiver**.

🤝 **Need-Based Support:**
Deserving students from economically weaker backgrounds can receive **up to 100% fee support**.

🏆 **Sports Excellence Waiver:**
State or National-level athletes receive a **25% tuition fee waiver**.

🏛️ **Government Reimbursement:**
Eligible SC, ST, and OBC candidates can avail full fee reimbursement per Telangana State government policies.`,
  },

  // 6. Campus & Facilities
  {
    topics: ["campus", "hostel", "facilities", "labs", "library", "sports", "gym", "wifi"],
    keywords: ["campus", "hostel", "hostels", "facility", "facilities", "lab", "labs", "library", "wifi", "food", "mess", "gym", "cricket", "sports", "room", "ac"],
    answer: `Our sprawling **25-Acre Smart Campus** in Hyderabad features top-tier amenities:

🏫 **Academic Infrastructure:**
• Smart, tech-enabled classrooms with digital projection and audio systems.
• **12 Advanced Research Laboratories** (AI & ML Lab, IoT Lab, Robotics Lab, VLSI Design Lab, and Cloud Networking Lab with 500+ high-end workstations).
• **Central Library** housing 50,000+ volumes, IEEE/ACM journals, and 24/7 digital access.
• Campus-wide high-speed Wi-Fi.

🛏️ **Hostels & Dining:**
• Separate modern hostels for boys and girls with AC and Non-AC room choices.
• Nutritious, hygienic vegetarian & non-vegetarian mess food.
• Fully equipped on-campus gym and fitness center.

⚽ **Sports & Well-Being:**
• Full sports complex for cricket, football, basketball, tennis, volleyball, and badminton.
• Indoor arena for table tennis, chess, and carrom.
• 24/7 on-campus medical center with doctors on call, ATMs, and convenience stores.`,
  },

  // 7. Faculty & Mentors
  {
    topics: ["faculty", "professors", "mentors", "teachers", "hod", "staff"],
    keywords: ["faculty", "professor", "professors", "teacher", "teachers", "mentor", "mentors", "hod", "dean", "rajesh", "ananya", "vikram", "meera"],
    answer: `Our faculty consists of **150+ distinguished educators** with a student-to-faculty ratio of **15:1**:

👨‍🏫 **Dr. Rajesh Kumar** — *Head of CSE Department*
• PhD from **IIT Bombay** with 20+ years of teaching experience.
• Published 50+ papers specializing in AI, Machine Learning, and Big Data.

👨‍🏫 **Dr. Vikram Patel** — *Professor, AI & DS*
• PhD from **Stanford University** and former **Google Research Scientist**.
• Author of 30+ NeurIPS publications specializing in NLP and Deep Learning.

👩‍🏫 **Prof. Ananya Sharma** — *Associate Professor, ECE*
• M.Tech from **IIT Hyderabad** with 5 years at **Texas Instruments**.
• Expert in VLSI Design, Embedded Systems, and IoT Architectures.

👩‍🏫 **Prof. Meera Reddy** — *Head of MBA Department*
• MBA from **IIM Ahmedabad**, PhD from **ISB Hyderabad**, formerly at **Deloitte**.
• Directs the EduReach Startup & Entrepreneurship Incubator.`,
  },

  // 8. Events & College Life
  {
    topics: ["events", "fest", "technova", "aarohan", "edusports", "hackathon"],
    keywords: ["event", "events", "fest", "fests", "festival", "technova", "aarohan", "edusports", "hackathon", "cultural", "sports meet"],
    answer: `Campus life at EduReach is vibrant and full of energy:

⚡ **TechNova (October):**
Our flagship annual national technical festival featuring 24-hour hackathons, robotics challenges, code-sprints, and paper presentations with 2,000+ participants from 50+ colleges.

🎭 **Aarohan (March):**
Annual grand cultural festival featuring live music bands, dance competitions, theatre, celebrity nights, and art exhibitions.

🏆 **EduSports (February):**
Inter-college sports tournament spanning cricket, football, basketball, athletics, and indoor tournaments.

💡 **Regular Activities:**
Monthly coding bootcamps, workshops, and active student chapters of IEEE, ACM, and CSI.`,
  },

  // 9. Contact & Timings
  {
    topics: ["contact", "phone", "email", "address", "location", "timings", "hours"],
    keywords: ["contact", "phone", "call", "mobile", "number", "email", "mail", "address", "location", "where", "timing", "hours", "reach"],
    answer: `Here is how you can connect with EduReach College:

📍 **Address:** EduReach College Campus, Hyderabad, Telangana, India.
📞 **Admissions Phone:** **+91 9876543210**
📧 **Admissions Email:** **admissions@edureach.edu.in**
🌐 **General Inquiries:** **info@edureach.edu.in**
🕒 **Office Hours:** Monday to Saturday, 9:00 AM – 5:00 PM *(Admissions desk remains open on Sundays during application season)*

💡 *Tip:* You can also click **"Talk to Counsellor"** on our homepage to speak directly with our AI Receptionist over live voice!`,
  },

  // 10. Greetings & Identity
  {
    topics: ["greeting", "hello", "hi", "hey", "who are you", "help"],
    keywords: ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "who are you", "what can you do", "help"],
    answer: `Hello! 👋 Welcome to **EduReach College**. I am your AI Counselor.

I can assist you instantly with:
1. 🎓 **Courses & Seats** (B.Tech, M.Tech, MBA)
2. 💰 **Fee Structure & Scholarships**
3. 📋 **Admissions Process & Cutoffs**
4. 🚀 **Placements & Top Recruiters**
5. 🛏️ **Hostel, Campus & Sports Facilities**
6. 📞 **Contact Details & Campus Visits**

What would you like to know today?`,
  },
];

// Ultra-fast fuzzy and keyword query matcher
export const findInstantCollegeAnswer = (query: string): string => {
  const clean = query.toLowerCase().trim();

  // Fast greetings check
  if (/^(hi|hello|hey|hola|good\s*(morning|afternoon|evening)|namaste)(\s|$|[!?])/i.test(clean)) {
    return KNOWLEDGE_ENTRIES.find((e) => e.topics.includes("greeting"))?.answer || "";
  }

  // Fast gratitude check
  if (/^(thanks|thank you|ok thanks|great|awesome|understood)(\s|$|[!?])/i.test(clean)) {
    return "You're very welcome! Feel free to ask if you have any more questions about EduReach College, or click 'Talk to Counsellor' to speak live with our receptionist. Best of luck! 🎓";
  }

  // Score each entry based on keyword occurrences
  let bestEntry = KNOWLEDGE_ENTRIES[0];
  let highestScore = 0;

  for (const entry of KNOWLEDGE_ENTRIES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (clean.includes(kw)) {
        score += kw.length > 4 ? 3 : 2;
      }
    }
    for (const topic of entry.topics) {
      if (clean.includes(topic)) {
        score += 4;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  // If match score is sufficient, return the targeted answer
  if (highestScore > 0) {
    return bestEntry.answer;
  }

  // Default helpful response
  return `EduReach College is a premier engineering institution in Hyderabad, Telangana (affil. JNTU-H, AICTE approved).

Here are quick details:
• **Programs:** B.Tech (CSE, AI&DS, ECE, IT, ME, Civil), M.Tech, and MBA.
• **Placements:** 92% placement rate, ₹42 LPA highest package (Google), ₹10.2 LPA CSE average.
• **B.Tech Fee:** ₹1,70,000/yr (Day Scholar), ₹2,50,000/yr (with Hostel & Mess).
• **Admissions:** 70% TS EAMCET + 30% Management quota (min 60% in 10+2 PCM).
• **Phone:** +91 9876543210 | **Email:** admissions@edureach.edu.in

Would you like more specific information about **courses**, **fee structure**, **admissions**, or **hostels**?`;
};
