// src/app/page.tsx
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react'

const expertisePillars = [
  {
    title: 'IB-inspired thinking',
    subtitle: 'Inquiry, reflection, and deeper understanding',
    description:
      'Students are encouraged to ask better questions, connect ideas, reflect on progress, and develop as independent learners.',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    title: 'Cambridge-style rigour',
    subtitle: 'Structure, clarity, and academic discipline',
    description:
      'Courses are designed with clear progression, strong foundations, subject depth, and the confidence to apply knowledge.',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: 'Professional expertise',
    subtitle: 'Real-world insight from passionate field experts',
    description:
      'Learning is enriched by practical experience, real examples, and meaningful links between academic knowledge and the world beyond school.',
    icon: <BriefcaseBusiness className="h-5 w-5" />,
  },
]

const studentExperience = [
  'Human-reviewed submissions',
  'Rubric-based qualitative feedback',
  'Portfolio evidence and highlights',
  'Deep knowledge questions',
  'On-demand multidisciplinary courses',
  'Progress reports for linked guardians',
]

const platformFeatures = [
  {
    title: 'Portfolio-first learning',
    description:
      'Students build a living record of evidence: submitted work, reflections, teacher feedback, strengths, and growth areas.',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: 'Qualitative grading',
    description:
      'Teachers evaluate work through rubrics and written feedback, helping students understand how to improve, not only whether they passed.',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    title: 'Expert online tutoring',
    description:
      'The platform feels like guided online tutoring: structured lessons, human review, and academic support from expert teachers.',
    icon: <MessageSquareMore className="h-5 w-5" />,
  },
  {
    title: 'Parent visibility',
    description:
      'Linked parents and guardians can follow student progress, submitted evidence, teacher feedback, and certificate milestones.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
]

const learningCycle = [
  {
    step: '01',
    title: 'Learn',
    description:
      'Students work through clear, structured lessons with media, resources, and deepening questions.',
  },
  {
    step: '02',
    title: 'Submit',
    description:
      'Students upload evidence: writing, images, PDFs, links, presentations, or project work.',
  },
  {
    step: '03',
    title: 'Receive feedback',
    description:
      'Human teachers review submissions with rubrics, qualitative grading, and clear next steps.',
  },
  {
    step: '04',
    title: 'Build portfolio',
    description:
      'Students collect highlights, reflections, feedback, skills, and evidence of real academic growth.',
  },
]

const audienceCards = [
  {
    label: 'For students',
    title: 'Learn with purpose',
    description:
      'Go beyond passive online courses. Build evidence, receive teacher feedback, and grow your understanding lesson by lesson.',
    href: '/register',
    linkLabel: 'Join free',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    label: 'For parents',
    title: 'See real progress',
    description:
      'Guardian reports help families understand progress, feedback, evidence, and certificate milestones from linked accounts.',
    href: '/parent',
    linkLabel: 'Parent report',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'For teachers',
    title: 'Build and share expertise',
    description:
      'A growing teacher hub for creating courses, sharing resources, reviewing evidence, and supporting student growth.',
    href: '#teachers',
    linkLabel: 'Coming soon',
    icon: <GraduationCap className="h-5 w-5" />,
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Flex <span className="text-blue-600">Scholar</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
            <a href="#home" className="transition hover:text-blue-600">
              Home
            </a>
            <a href="#about" className="transition hover:text-blue-600">
              About
            </a>
            <a href="#training" className="transition hover:text-blue-600">
              Free Training
            </a>
            <a href="#services" className="transition hover:text-blue-600">
              Services
            </a>
            <a href="#teachers" className="transition hover:text-blue-600">
              Teachers
            </a>
            <a href="#community" className="transition hover:text-blue-600">
              Community
            </a>
            <a href="#resources" className="transition hover:text-blue-600">
              Resources
            </a>
            <a href="#contact" className="transition hover:text-blue-600">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Join Free
            </Link>
          </div>
        </div>
      </header>

      <section
        id="home"
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_#1d4ed8_0,_#0f172a_38%,_#020617_100%)] text-white"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-400 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.08fr_460px] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100">
              <Star className="h-4 w-4 text-amber-300" />
              IB expertise · Cambridge rigour · Professional insight
            </div>

            <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Expert-guided online learning with real teacher feedback
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
              Flex Scholar is not just another online course platform. It is a
              human-centred academic academy where students learn on demand,
              submit real evidence, receive qualitative feedback, and build a
              portfolio that shows genuine progress.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-extrabold text-slate-950 transition hover:bg-blue-50"
              >
                Start your learning journey
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#about"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-extrabold text-white transition hover:bg-white/15"
              >
                See what makes us different
              </a>
            </div>

            <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div>
                <p className="text-4xl font-black text-white">IB</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  inquiry and reflection
                </p>
              </div>
              <div>
                <p className="text-4xl font-black text-white">Cambridge</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  rigour and mastery
                </p>
              </div>
              <div>
                <p className="text-4xl font-black text-white">Human</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  feedback and mentoring
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.3rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[1.8rem] bg-white p-7 text-slate-950 shadow-2xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
                Student growth system
              </p>

              <h2 className="mt-4 text-3xl font-black leading-tight">
                More than pass or fail
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Students build a portfolio of learning evidence reviewed by
                expert teachers.
              </p>

              <div className="mt-6 space-y-3">
                {studentExperience.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-extrabold text-white transition hover:bg-blue-700"
              >
                Join the free portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
              Why Flex Scholar
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              A stronger kind of online academy
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              We combine internationally respected teaching approaches with
              real-world expertise. The result is a learning experience that is
              structured, reflective, challenging, and personal.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {expertisePillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  {pillar.icon}
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                  {pillar.title}
                </p>
                <h3 className="mt-3 text-2xl font-black">{pillar.subtitle}</h3>
                <p className="mt-4 leading-7 text-slate-600">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
                Not just quizzes
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                Real evaluation from human teachers
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Students do not simply answer a quiz, receive a pass mark, and
                move on. They submit evidence of learning and receive meaningful
                teacher evaluation that explains strengths, next steps, and
                areas for growth.
              </p>

              <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
                <p className="text-xl font-black text-slate-950">
                  The goal is not only completion.
                </p>
                <p className="mt-2 leading-7 text-slate-700">
                  The goal is deeper understanding, stronger thinking, and a
                  portfolio that shows progress over time.
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              {platformFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex gap-5">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-amber-300">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">{feature.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="training" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
                How learning works
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                Learn, submit, receive feedback, build your portfolio
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Courses are on demand, multidisciplinary, and designed with
                questions that expand understanding. Students are guided to
                think, create, explain, reflect, and improve.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-extrabold text-white transition hover:bg-blue-700"
                >
                  Explore free training
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-extrabold text-slate-950 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Student login
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {learningCycle.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className="mt-2 leading-7 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">
              Services
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Academic support for students and families
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Flex Scholar supports learners through structured courses,
              expert-guided tutoring, portfolio development, and teacher-led
              feedback that helps students keep improving.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {audienceCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600">
                  {card.icon}
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-blue-200">
                  {card.label}
                </p>
                <h3 className="mt-3 text-2xl font-black">{card.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">
                  {card.description}
                </p>

                <Link
                  href={card.href}
                  className="mt-7 inline-flex items-center gap-2 font-extrabold text-blue-200 transition hover:text-white"
                >
                  {card.linkLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-8 shadow-sm lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
                  Parent and guardian reports
                </p>

                <h2 className="mt-4 text-4xl font-black leading-tight">
                  Families can see the learning journey
                </h2>

                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Linked guardians can access reports that show course progress,
                  submitted work, teacher feedback, rubric trends, and
                  certificate milestones.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  'Linked parent accounts',
                  'Course progress visibility',
                  'Teacher feedback history',
                  'Portfolio and evidence reports',
                  'Certificate milestones',
                  'Safe admin-managed access',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="teachers" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-600">
              Growing ecosystem
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              A future hub for teachers, students, and resources
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Flex Scholar is designed to grow beyond courses into a learning
              ecosystem where teachers share expertise, students ask questions,
              and resources support deeper academic development.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-2xl font-black">Teachers</h3>
              <p className="mt-4 leading-7 text-slate-600">
                A hub for teachers to build knowledge, share expertise, create
                resources, and contribute to academic excellence.
              </p>
              <span className="mt-6 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Coming soon
              </span>
            </article>

            <article
              id="community"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <MessageSquareMore className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-2xl font-black">Community</h3>
              <p className="mt-4 leading-7 text-slate-600">
                A student community for asking course-related questions,
                discussing ideas, and learning with others.
              </p>
              <span className="mt-6 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Coming soon
              </span>
            </article>

            <article
              id="resources"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Layers3 className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-2xl font-black">Resources</h3>
              <p className="mt-4 leading-7 text-slate-600">
                A growing library of academic resources, lesson materials,
                guidance, and tools for students, families, and teachers.
              </p>
              <span className="mt-6 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Coming soon
              </span>
            </article>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="bg-[radial-gradient(circle_at_top_left,_#1d4ed8_0,_#0f172a_42%,_#020617_100%)] text-white"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">
              Ready to start?
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Join an academy built for real academic progress
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-200">
              Start with free training, explore expert-guided courses, and build
              a learning portfolio supported by human teacher feedback.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Begin today</h3>
                <p className="mt-2 leading-7 text-slate-200">
                  Create a free account and start building evidence of your
                  learning journey.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-extrabold text-slate-950 transition hover:bg-blue-50"
              >
                Join Free
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="mailto:info@torresacademy.com"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-extrabold text-white transition hover:bg-white/10"
              >
                Contact Flex Scholar
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="text-3xl font-black">
              Flex <span className="text-blue-600">Scholar</span>
            </h3>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Expert-guided online learning combining IB thinking, Cambridge
              rigour, and professional insight with portfolio evidence and human
              teacher feedback. By Torres Academy.
            </p>
          </div>

          <div>
            <p className="font-black text-slate-950">Explore</p>
            <div className="mt-4 space-y-3 text-sm font-medium text-slate-600">
              <a href="#training" className="block hover:text-blue-600">
                Free Training
              </a>
              <a href="#services" className="block hover:text-blue-600">
                Services
              </a>
              <a href="#teachers" className="block hover:text-blue-600">
                Teachers
              </a>
              <a href="#community" className="block hover:text-blue-600">
                Community
              </a>
              <a href="#resources" className="block hover:text-blue-600">
                Resources
              </a>
            </div>
          </div>

          <div>
            <p className="font-black text-slate-950">Portal</p>
            <div className="mt-4 space-y-3 text-sm font-medium text-slate-600">
              <Link href="/login" className="block hover:text-blue-600">
                Login
              </Link>
              <Link href="/register" className="block hover:text-blue-600">
                Join Free
              </Link>
              <Link href="/parent" className="block hover:text-blue-600">
                Parent Report
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5 text-center text-sm text-slate-500">
          © 2026 Flex Scholar. By Torres Academy. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
