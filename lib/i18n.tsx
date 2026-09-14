'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * i18n — English (EN), Luganda (LG), Swahili (SW), Luo/Acholi (LUO).
 * (plan 1.2: language switch before any form; founder extended scope to SW/LUO)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ⚠️ TRANSLATION STATUS — READ BEFORE MARKETING IN NON-ENGLISH LANGUAGES
 *
 * ENGLISH (en) is the SOURCE OF TRUTH. All UI copy decisions, legal wording,
 * and product terminology are defined by the English strings in this file.
 *
 * LG / SW / LUO are AI-DRAFTED translations. They have NOT been reviewed by
 * native speakers. Before any public marketing, onboarding campaigns, or
 * official communication in Luganda, Swahili, or Luo, every string below
 * MUST be reviewed and approved by a native speaker of that language.
 *
 * "LUO" here means Northern Ugandan Luo (Acholi/Lango region) written in
 * standard Luo orthography as commonly used in Uganda — not Kenyan Dholuo.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Lightweight, dependency-free (plan rule 5). The choice persists in
 * localStorage ('kola_lang'). Usage:
 *
 *   const { t, lang, setLang } = useI18n();
 *   <h1>{t('login.welcome')}</h1>
 *   <p>{t('job.postedBy', { name: job.employerName })}</p>
 *
 * Interpolation: {placeholders} in a string are replaced from the optional
 * vars map. Missing keys fall back to English, then to the key itself — a
 * missing translation can never crash or blank the UI.
 *
 * Layout note: target devices are low-end Android phones — keep translations
 * concise; long strings break layouts.
 */

export type Lang = 'en' | 'lg' | 'sw' | 'luo';

const dict: Record<string, { en: string; lg: string; sw: string; luo: string }> = {
  // ── Common ─────────────────────────────────────────────
  'common.continue':    { en: 'Continue',                    lg: 'Weeyongereyo',          sw: 'Endelea',               luo: 'Med anyim' },
  'common.back':        { en: 'Back',                        lg: 'Dda emabega',           sw: 'Rudi nyuma',            luo: 'Dok cen' },
  'common.loading':     { en: 'Loading…',                    lg: 'Lindako…',              sw: 'Inapakia…',             luo: 'Kur…' },
  'common.search':      { en: 'Search',                      lg: 'Noonya',                sw: 'Tafuta',                luo: 'Yeny' },
  'common.cancel':      { en: 'Cancel',                      lg: 'Sazaamu',               sw: 'Ghairi',                luo: 'Juk' },
  'common.save':        { en: 'Save',                        lg: 'Kuuma',                 sw: 'Hifadhi',               luo: 'Gwok' },
  'common.networkError': { en: 'Network error. Please try again.', lg: 'Enkuutira yebyokugamba egyizeeko. Gezaako nate.', sw: 'Tatizo la mtandao. Jaribu tena.', luo: 'Netwok obalo. Tem doki.' },
  'common.new':         { en: 'New',                         lg: 'Mupya',                 sw: 'Mpya',                  luo: 'Manyen' },
  'common.photosCount': { en: '{n} photos',                  lg: 'ebifaananyi {n}',       sw: 'picha {n}',             luo: 'cal {n}' },

  // ── Onboarding ─────────────────────────────────────────
  'onboarding.next':    { en: 'Next',                        lg: 'Genda mu maaso',        sw: 'Endelea',               luo: 'Cit anyim' },
  'onboarding.skip':    { en: 'Skip',                        lg: 'Buuka',                 sw: 'Ruka',                  luo: 'Kal' },
  'onboarding.getStarted': { en: 'Get Started',              lg: 'Tandika kati',          sw: 'Anza sasa',             luo: 'Cak kombedi' },
  'ob.s1tag':           { en: 'For Workers',                 lg: 'Ku Bafundi',            sw: 'Kwa Mafundi',           luo: 'Pi Bafundi' },
  'ob.s1title':         { en: 'Find daily jobs\nnear you',   lg: 'Noonya emirimu\negy’okumpi', sw: 'Pata kazi za kila siku\nkaribu nawe', luo: 'Nong tic me cengcon\ncok kedwu' },
  'ob.s1desc':          { en: 'Discover local gigs for cleaning, building, driving and more — right in your neighbourhood.', lg: 'Funa emirimu egy’okuyonja, okuzimba, okuvuga n’ebirala — mu kitundu kyo.', sw: 'Pata kazi za usafi, ujenzi, udereva na zaidi — hapo mtaani kwako.', luo: 'Nong tic me cwiyo, gedo, moko gidya ki mukene — i kabedo mera.' },
  'ob.s2tag':           { en: 'For Employers',               lg: 'Ku Abagwanika',         sw: 'Kwa Waajiri',           luo: 'Pi Lula Cul' },
  'ob.s2title':         { en: 'Hire trusted\nworkers fast',  lg: 'Gwanika bafundi\nabeesigika mangu', sw: 'Ajira wafanyakazi\nwaaminifu haraka', luo: 'Cul bafundi ma gen\noyot oyot' },
  'ob.s2desc':          { en: 'Post a job in under 1 minute and get matched with verified, rated workers instantly.', lg: 'Yatula omulimu mu ddakiika 1, ofune bafundi abakakasiddwa era abagereddwaako.', sw: 'Tangaza kazi ndani ya dakika 1, uunganishwe na mafundi waliothibitishwa mara moja.', luo: 'Yab tic i dakiika 1, inong bafundi ma kimoko gi cut.' },
  'ob.s3tag':           { en: 'Get Paid',                    lg: 'Funa Ensimbi',          sw: 'Lipwa',                 luo: 'Nong Cul' },
  'ob.s3title':         { en: 'Get it done.\nGet paid.',     lg: 'Omulimu gukolebwe.\nOfune ensimbi.', sw: 'Kazi ifanywe.\nUpate malipo.', luo: 'Tic otum.\nInong cula.' },
  'ob.s3desc':          { en: 'Complete jobs, build your reputation, and grow your income on TUKOLA.', lg: 'Maliriza emirimu, zimba erinnya lyo, owongere ensimbi zo ku TUKOLA.', sw: 'Kamilisha kazi, jenga sifa yako, na kuongeza kipato chako kwenye TUKOLA.', luo: 'Tum tic, ger nyingi, imed lim mera i TUKOLA.' },
  'ob.getStartedFree':  { en: 'Get Started Free',            lg: 'Tandika Kati — Ku Bwereere', sw: 'Anza Bure',         luo: 'Cak Kombedi — Fere' },
  'ob.signIn':          { en: 'Already have an account? Sign in', lg: 'Olina akawunti? Yingira', sw: 'Tayari una akaunti? Ingia', luo: 'Akaunti tye botwu? Donyo iyie' },
  'ob.skipIntro':       { en: 'Skip intro',                  lg: 'Buuka',                 sw: 'Ruka utangulizi',       luo: 'Kal man' },

  // ── Login ──────────────────────────────────────────────
  'login.welcome':      { en: 'Welcome back',                lg: 'Tukwaniriza nate',      sw: 'Karibu tena',           luo: 'Apwoyo dok' },
  'login.subtitle':     { en: 'Enter your phone number to continue', lg: 'Wandika ennamba yo ya ssimu weeyongereyo', sw: 'Weka namba yako ya simu kuendelea', luo: 'Ket namba me simu me mede anyim' },
  'login.codeHint':     { en: "We'll send a 6-digit verification code.", lg: 'Tujja kukusindikira koodi ya nnamba mukaaga (6).', sw: 'Tutakutumia msimbo wa tarakimu 6.', luo: 'Bicwali kod me namba 6.' },
  'login.invalidPhone': { en: 'Enter a valid 9-digit Uganda phone number', lg: 'Wandika ennamba ya ssimu ya Uganda entuufu (nnamba 9)', sw: 'Weka namba sahihi ya simu ya Uganda (tarakimu 9)', luo: 'Ket namba me simu me Uganda ma tye atir (9)' },
  'login.sendError':    { en: 'Could not send the code. Please try again.', lg: 'Koodi tezze. Gezaako nate.', sw: 'Msimbo haujatuma. Jaribu tena.', luo: 'Kod pe oo. Tem doki.' },
  'login.networkError': { en: 'Network error. Please try again.', lg: 'Enkuutira yebyokugamba egyizeeko. Gezaako nate.', sw: 'Tatizo la mtandao. Jaribu tena.', luo: 'Netwok obalo. Tem doki.' },
  'login.sending':      { en: 'Sending code...',             lg: 'Koodi esindikibwa…',    sw: 'Inatuma msimbo...',     luo: 'Kod tye ka cita…' },
  'login.tagline':      { en: 'Kampala’s fundi marketplace', lg: 'Akatale ka bafundi e Kampala', sw: 'Soko la mafundi la Kampala', luo: 'Cuk me bafundi me Kampala' },
  'login.termsPrefix':  { en: 'By continuing, you agree to TUKOLA’s', lg: 'Bw’oweeyongereyo, okkiriza', sw: 'Kuendelea, unakubali', luo: 'Ka imede anyim, iyee' },
  'login.terms':        { en: 'Terms',                       lg: 'Amateeka',              sw: 'Masharti',              luo: 'Cik' },
  'login.privacy':      { en: 'Privacy Policy',              lg: 'Enkola y’Ekyama',       sw: 'Sera ya Faragha',       luo: 'Cik me mung' },
  'login.and':          { en: '&',                           lg: 'ne',                    sw: 'na',                    luo: 'ki' },

  // ── Verify ─────────────────────────────────────────────
  'verify.title':       { en: 'Enter verification code',     lg: 'Wandika koodi y’okukakasa', sw: 'Weka msimbo wa uthibitishaji', luo: 'Ket kod me moko' },
  'verify.subtitle':    { en: 'We sent a 6-digit code to',   lg: 'Tusindise koodi ya nnamba 6 ku', sw: 'Tumetuma msimbo wa tarakimu 6 kwa', luo: 'Wacwalo kod me namba 6 bot' },
  'verify.verify':      { en: 'Verify',                      lg: 'Kakasa',                sw: 'Thibitisha',            luo: 'Mok' },
  'verify.verifying':   { en: 'Verifying…',                  lg: 'Okukakasa kugenda mu maaso…', sw: 'Inathibitisha…',    luo: 'Tye ka moko…' },
  'verify.resend':      { en: 'Resend code',                 lg: 'Ddamu osindike koodi',  sw: 'Tuma tena msimbo',      luo: 'Cwalo kod doki' },
  'verify.wrongCode':   { en: 'Wrong code. Please try again.', lg: 'Koodi si ntuufu. Gezaako nate.', sw: 'Msimbo si sahihi. Jaribu tena.', luo: 'Kod pe atir. Tem doki.' },
  'verify.demoCode':    { en: 'Demo code:',                  lg: 'Koodi ya demo:',        sw: 'Msimbo wa demo:',       luo: 'Kod me demo:' },

  // ── Role select ────────────────────────────────────────
  'role.title':         { en: 'How will you use Tukola?',    lg: 'Ojja okozesa Tukola otya?', sw: 'Utatumia Tukola vipi?', luo: 'Iti Tukola nining?' },
  'role.welcome':       { en: 'Welcome to TUKOLA',           lg: 'Tukwaniriza ku TUKOLA', sw: 'Karibu TUKOLA',         luo: 'Apwoyo bot TUKOLA' },
  'role.choose':        { en: 'Choose how you want to use the platform today.', lg: 'Londa enkola gy’ojja okukozesa leero.', sw: 'Chagua jinsi unavyotaka kutumia jukwaa leo.', luo: 'Yer kit ma imito tic kwede eni.' },
  'role.needWork':      { en: 'I need Work',                 lg: 'Njagala Omulimu',       sw: 'Nahitaji Kazi',         luo: 'Amito Tic' },
  'role.needWorkSub':   { en: 'Browse available jobs, apply for gigs, and earn money for your skills.', lg: 'Noonya emirimu egiliwo, osabe, ofune ensimbi ku bumanyirivu bwo.', sw: 'Vinjari kazi zilizopo, omba, upate pesa kwa ujuzi wako.', luo: 'Yeny tic ma tye, peny, nong lim pi ngec mera.' },
  'role.wantHire':      { en: 'I want to Hire',              lg: 'Njagala Okugwanika',    sw: 'Nataka Kuajiri',        luo: 'Amito Culo Dano' },
  'role.wantHireSub':   { en: 'Post a job description, find reliable workers, and get your tasks done.', lg: 'Yatula omulimu, onoonye bafundi abeesigika, emirimu gyo gikolebwe.', sw: 'Tangaza kazi, pata wafanyakazi wa kuaminika, kazi zikamilike.', luo: 'Yab tic, nong bafundi ma gen, tic mera otum.' },
  'role.yourName':      { en: "What's your name?",           lg: 'Erinnya lyo ggyani?',   sw: 'Jina lako nani?',       luo: 'Nyingi en aye?' },
  'role.nameSubWorker': { en: 'This is how employers will see you on TUKOLA.', lg: 'Abagwanika bwe balijja kukulaba ku TUKOLA.', sw: 'Hivi ndivyo waajiri watakavyokuona TUKOLA.', luo: 'Man en ma lula culi bineno kwede i TUKOLA.' },
  'role.nameSubEmployer': { en: 'This is how workers will see you on TUKOLA.', lg: 'Bafundi bwe balijja kukulaba ku TUKOLA.', sw: 'Hivi ndivyo mafundi watakavyokuona TUKOLA.', luo: 'Man en ma bafundi bineno kwede i TUKOLA.' },
  'role.welcomeWorker': { en: 'Welcome, Fundi!',             lg: 'Tukwaniriza, Fundi!',   sw: 'Karibu, Fundi!',        luo: 'Apwoyo, Fundi!' },
  'role.welcomeEmployer': { en: 'Welcome, Employer!',        lg: 'Tukwaniriza, Omuwesi!', sw: 'Karibu, Mwajiri!',      luo: 'Apwoyo, Lula cul!' },
  'role.setup':         { en: 'Setting up your account...',  lg: 'Akawunti yo eteekwateekwa…', sw: 'Inaandaa akaunti yako...', luo: 'Akaunti ni tye ka yuba…' },
  'role.changeRole':    { en: '← Change role',               lg: '← Kyuusa',              sw: '← Badilisha',           luo: '← Lok' },
  'role.secureNote':    { en: 'Every account is phone-verified', lg: 'Buli akawunti ekakasibwa ku ssimu', sw: 'Kila akaunti imethibitishwa kwa simu', luo: 'Akaunti weng kimoko gi ki simu' },
  'role.errorCreate':   { en: 'Could not create your account. Please verify your phone again.', lg: 'Akawunti yo teyakolebwa. Ddamu okakase ssimu yo.', sw: 'Akaunti haijundikwa. Thibitisha simu yako tena.', luo: 'Akaunti mera pe ocwe. Mok simu mera doki.' },
  'role.worker':        { en: 'I want to work',              lg: 'Njagala okukola',       sw: 'Nataka kufanya kazi',   luo: 'Amito tic' },
  'role.workerSub':     { en: 'Find jobs and earn money',    lg: 'Noonya emirimu ofune ensimbi', sw: 'Tafuta kazi upate pesa', luo: 'Yeny tic nong lim' },
  'role.employer':      { en: 'I want to hire',              lg: 'Njagala okugwanika',    sw: 'Nataka kuajiri',        luo: 'Amito culo dano' },
  'role.employerSub':   { en: 'Post jobs and find fundis',   lg: 'Yatula emirimu onoonye bafundi', sw: 'Tangaza kazi upate mafundi', luo: 'Yab tic nong bafundi' },
  'role.name':          { en: 'Your name',                   lg: 'Erinnya lyo',           sw: 'Jina lako',             luo: 'Nyingi' },
  'role.namePlaceholder': { en: 'e.g. Amina Nakato',         lg: 'Nga: Amina Nakato',     sw: 'Mf. Amina Nakato',      luo: 'Cal: Amina Nakato' },
  'role.creating':      { en: 'Creating your account…',      lg: 'Akawunti yo eteekwateekwa…', sw: 'Inaunda akaunti yako…', luo: 'Akaunti mera tye ka yuba…' },
  'role.finish':        { en: 'Start using Tukola',          lg: 'Tandika okozesa Tukola', sw: 'Anza kutumia Tukola',  luo: 'Cak tic ki Tukola' },

  // ── Worker home ────────────────────────────────────────
  'worker.findJobs':    { en: 'Find Jobs',                   lg: 'Noonya Emirimu',        sw: 'Tafuta Kazi',           luo: 'Yeny Tic' },
  'worker.myJobs':      { en: 'My Jobs',                     lg: 'Emirimu Gyange',        sw: 'Kazi Zangu',            luo: 'Tic Mera' },
  'worker.messages':    { en: 'Messages',                    lg: 'Obubaka',               sw: 'Ujumbe',                luo: 'Kwena' },
  'worker.profile':     { en: 'Profile',                     lg: 'Profayiro',             sw: 'Wasifu',                luo: 'Profile' },
  'worker.apply':       { en: 'Apply for this Job',          lg: 'Saba Omulimu Guno',     sw: 'Omba Kazi Hii',         luo: 'Peny Tic Man' },
  'worker.applied':     { en: 'Applied Successfully',        lg: 'Osabye Bulungi',        sw: 'Umeomba Kazi',          luo: 'Ipenyo Tic' },
  'worker.acceptInvite': { en: 'Accept Invitation — Start Job', lg: 'Kkiriza Oluyita — Tandika Omulimu', sw: 'Kubali Mwaliko — Anza Kazi', luo: 'Yee Luyita — Cak Tic' },
  'worker.markDone':    { en: 'Mark as Done',                lg: 'Omulimu Gwedde',        sw: 'Kazi Imekwisha',        luo: 'Tic Otum' },

  // ── Worker dashboard (home) ────────────────────────────
  'wh.morning':         { en: 'Good morning',                lg: 'Wasuze otya',           sw: 'Habari za asubuhi',     luo: 'Ibedi maber' },
  'wh.afternoon':       { en: 'Good afternoon',              lg: 'Osiibye otya',          sw: 'Habari za mchana',      luo: 'Ceng maber' },
  'wh.evening':         { en: 'Good evening',                lg: 'Oliri otya',            sw: 'Habari za jioni',       luo: 'Otiki maber' },
  'wh.completed':       { en: 'Completed',                   lg: 'Biwedde',               sw: 'Zimekamilika',          luo: 'Ma otum' },
  'wh.rating':          { en: 'Rating',                      lg: 'Obuziibwa',             sw: 'Kiwango',               luo: 'Wel' },
  'wh.searchPlaceholder': { en: 'Search jobs, skills, location...', lg: 'Noonya emirimu, obusobozi, ekifo...', sw: 'Tafuta kazi, ujuzi, eneo...', luo: 'Yeny tic, ngec, kabedo...' },
  'wh.browse':          { en: 'Browse by Service',           lg: 'Londa mu Ssinzi',       sw: 'Vinjari kwa Huduma',    luo: 'Yer ki Tic' },
  'wh.clearFilter':     { en: 'Clear filter',                lg: 'Gyako ekiziyiza',       sw: 'Ondoa kichujio',        luo: 'Kwany yero' },
  'wh.urgentOne':       { en: '{n} urgent job near you',     lg: 'omulimu {n} ogw’amangu okumpi nawe', sw: 'kazi {n} ya haraka karibu nawe', luo: 'tic {n} me oyot cok kedwu' },
  'wh.urgentMany':      { en: '{n} urgent jobs near you',    lg: 'emirimu {n} egy’amangu okumpi nawe', sw: 'kazi {n} za haraka karibu nawe', luo: 'tic {n} me oyot cok kedwu' },
  'wh.urgentSub':       { en: 'Employers need workers right now', lg: 'Abagwanika beetaaga bafundi kakano', sw: 'Waajiri wanahitaji mafundi sasa hivi', luo: 'Lula cul mito bafundi kombedi' },
  'wh.available':       { en: 'Available Near You',          lg: 'Emirimu Egikulira',     sw: 'Kazi Karibu Nawe',      luo: 'Tic Ma Cok Kedwu' },
  'wh.categoryJobs':    { en: '{cat} Jobs',                  lg: 'Emirimu gy’e{cat}',     sw: 'Kazi za {cat}',         luo: 'Tic me {cat}' },
  'wh.noJobs':          { en: 'No jobs found',               lg: 'Tewali mirimu egisangiddwa', sw: 'Hakuna kazi zilizopatikana', luo: 'Tic pe ononge' },
  'wh.noJobsSub':       { en: 'Try a different search or category', lg: 'Gezako okunoonya oba ekika eky’endala', sw: 'Jaribu utafutaji au aina nyingine', luo: 'Tem yeny onyo kite mukene' },
  'wh.applied':         { en: 'Applied',                     lg: 'Osabye',                sw: 'Umeomba',               luo: 'Ipenyo' },
  'wh.applyNow':        { en: 'Apply Now',                   lg: 'Saba Kati',             sw: 'Omba Sasa',             luo: 'Peny Kombedi' },
  'wh.today':           { en: 'Today {time}',                lg: 'Leero {time}',          sw: 'Leo {time}',            luo: 'Eni {time}' },
  'day.0':              { en: 'Sun',                         lg: 'Ssa',                   sw: 'Jpl',                   luo: 'Sab' },
  'day.1':              { en: 'Mon',                         lg: 'Bal',                   sw: 'Jtt',                   luo: 'C1' },
  'day.2':              { en: 'Tue',                         lg: 'Lw2',                   sw: 'Jmn',                   luo: 'C2' },
  'day.3':              { en: 'Wed',                         lg: 'Lw3',                   sw: 'Jtn',                   luo: 'C3' },
  'day.4':              { en: 'Thu',                         lg: 'Lw4',                   sw: 'Alh',                   luo: 'C4' },
  'day.5':              { en: 'Fri',                         lg: 'Lw5',                   sw: 'Ijm',                   luo: 'C5' },
  'day.6':              { en: 'Sat',                         lg: 'Lw6',                   sw: 'Jms',                   luo: 'C6' },

  // ── Worker jobs page ───────────────────────────────────
  'wj.active':          { en: 'Active',                      lg: 'Egikolebwa',            sw: 'Zinaendelea',           luo: 'Ma tye ka cita' },
  'wj.completed':       { en: 'Completed',                   lg: 'Ebiwedde',              sw: 'Zimekamilika',          luo: 'Ma otum' },
  'wj.pending':         { en: 'Pending',                     lg: 'Ezirindiriddwa',        sw: 'Zinasubiri',            luo: 'Ma kuro' },
  'wj.noActive':        { en: 'No active jobs',              lg: 'Tewali mirimu egikolebwa', sw: 'Hakuna kazi zinazoendelea', luo: 'Tic pe tye ka cita' },
  'wj.noCompleted':     { en: 'No completed jobs yet',       lg: 'Ebiwedde tebinnabaawo', sw: 'Bado hakuna kazi zilizokamilika', luo: 'Pe tye tic ma otum' },
  'wj.noPending':       { en: 'No pending applications',     lg: 'Tewali byosabye birindiriddwa', sw: 'Hakuna maombi yanayosubiri', luo: 'Pe tye pyen ma kuro' },
  'wj.noActiveSub':     { en: "Jobs you're hired for will appear here. Browse new jobs near you.", lg: 'Emirimu gy’ogwanikiddwa gija kugatera wano. Noonya emirimu emipya okumpi nawe.', sw: 'Kazi ulizoajiriwa zitaonekana hapa. Vinjari kazi mpya karibu nawe.', luo: 'Tic ma guculu botwu bitime ka. Yeny tic manyen cok kedwu.' },
  'wj.noCompletedSub':  { en: 'Finished jobs and ratings will show here.', lg: 'Emirimu egiwedde n’obuziibwa bijakulabika wano.', sw: 'Kazi zilizokamilika na tathmini zitaonekana hapa.', luo: 'Tic ma otum ki ketgi bitime ka.' },
  'wj.noPendingSub':    { en: "Jobs you've applied to will appear here.", lg: 'Emirimu gy’osabye gija kugatera wano.', sw: 'Kazi ulizoomba zitaonekana hapa.', luo: 'Tic ma ipenyo bitime ka.' },
  'wj.browseJobs':      { en: 'Browse jobs',                 lg: 'Noonya emirimu',        sw: 'Vinjari kazi',          luo: 'Yeny tic' },
  'wj.inProgress':      { en: 'IN PROGRESS',                 lg: 'GUGENDA MU MAASO',      sw: 'INAENDELEA',            luo: 'TYE KA MEDE' },
  'wj.done':            { en: 'DONE',                        lg: 'GWEDDE',                sw: 'IMEKWISHA',             luo: 'OTUM' },
  'wj.appliedBadge':    { en: 'APPLIED',                     lg: 'OSABYE',                sw: 'UMEOMBA',               luo: 'IPENYO' },
  'wj.earnings':        { en: 'Earnings: UGX {amount}',      lg: 'Ensimbi: UGX {amount}', sw: 'Mapato: UGX {amount}',  luo: 'Lim: UGX {amount}' },
  'wj.viewMap':         { en: 'View Map',                    lg: 'Laba Mape',             sw: 'Angalia Ramani',        luo: 'Nen Map' },
  'wj.message':         { en: 'Message',                     lg: 'Bubaka',                sw: 'Ujumbe',                luo: 'Kwena' },
  'wj.viewDetails':     { en: 'View Details',                lg: 'Laba Ebisingawo',       sw: 'Angalia Maelezo',       luo: 'Nen Gin Ma Pol' },
  'wj.viewJob':         { en: 'View Job',                    lg: 'Laba Omulimu',          sw: 'Angalia Kazi',          luo: 'Nen Tic' },

  // ── Employer home ──────────────────────────────────────
  'employer.postJob':   { en: 'Post a New Job',              lg: 'Yatula Omulimu Omupya', sw: 'Tangaza Kazi Mpya',     luo: 'Yab Tic Manyen' },
  'employer.myJobs':    { en: 'My Jobs',                     lg: 'Emirimu Gyange',        sw: 'Kazi Zangu',            luo: 'Tic Mera' },
  'employer.findFundis': { en: 'Find Fundis',                lg: 'Noonya Bafundi',        sw: 'Tafuta Mafundi',        luo: 'Yeny Bafundi' },
  'employer.hire':      { en: 'Hire',                        lg: 'Gwanika',               sw: 'Ajira',                 luo: 'Cul' },
  'employer.topRated':  { en: 'Top Rated',                   lg: 'Asinga Obugeri',        sw: 'Bora Zaidi',            luo: 'Ma Ja Loyo' },
  'employer.bookAgain': { en: 'Book this fundi again',       lg: 'Ddamu ogwanike fundi ono', sw: 'Mwajiri fundi huyu tena', luo: 'Doki cul fundi man' },
  'employer.nearMe':    { en: 'Near me',                     lg: 'Okumpi nange',          sw: 'Karibu nami',           luo: 'Cok keda' },
  'employer.areaPlaceholder': { en: 'Type your area — e.g. Kololo, Ntinda, Kira', lg: 'Wandika ekifo ky’obeera — nga Kololo, Ntinda, Kira', sw: 'Andika eneo lako — mf. Kololo, Ntinda, Kira', luo: 'Ket kabedo mera — cal Kololo, Ntinda, Kira' },

  // ── Employer dashboard ─────────────────────────────────
  'ed.hello':           { en: 'Hello, {name}',               lg: 'Gyebale ko, {name}',    sw: 'Habari, {name}',        luo: 'Ber, {name}' },
  'ed.manageJobs':      { en: 'Manage your jobs',            lg: 'Ddukanya emirimu gyo',  sw: 'Dhibiti kazi zako',     luo: 'Temo tic mera' },
  'ed.activeCount':     { en: '{n} active',                  lg: '{n} egikolebwa',        sw: '{n} zinaendelea',       luo: '{n} ma tye ka cita' },
  'ed.pendingCount':    { en: '{n} pending',                 lg: '{n} ezirindiriddwa',    sw: '{n} zinasubiri',        luo: '{n} ma kuro' },
  'ed.recentPosts':     { en: 'My Recent Posts',             lg: 'Emirimu Gyange Egipya', sw: 'Kazi Zangu za Karibuni', luo: 'Tic Mera Ma Manyen' },
  'ed.viewAll':         { en: 'View all',                    lg: 'Laba byonna',           sw: 'Ona zote',              luo: 'Nen gi weng' },
  'ed.noJobs':          { en: 'No jobs posted yet',          lg: 'Tewali mirimu egiwereereddwa', sw: 'Bado hujatangaza kazi', luo: 'Pe itye yabo tic' },
  'ed.noJobsSub':       { en: 'Post your first job above',   lg: 'Yatula omulimu gwo ogusoose waggulu', sw: 'Tangaza kazi yako ya kwanza hapo juu', luo: 'Yab tic mera me munyu malo' },
  'ed.workerLabel':     { en: 'Worker:',                     lg: 'Fundi:',                sw: 'Fundi:',                luo: 'Fundi:' },
  'ed.track':           { en: 'Track',                       lg: 'Linda',                 sw: 'Fuatilia',              luo: 'Lub kor' },
  'ed.applicant':       { en: '{n} applicant',               lg: 'abasabye {n}',          sw: 'waombaji {n}',          luo: 'jo {n} openyo' },
  'ed.applicants':      { en: '{n} applicants',              lg: 'abasabye {n}',          sw: 'waombaji {n}',          luo: 'jo {n} openyo' },
  'ed.review':          { en: 'Review',                      lg: 'Kebera',                sw: 'Kagua',                 luo: 'Nen' },
  'ed.suggested':       { en: 'Suggested Nearby',            lg: 'Abasoboka Okumpi',      sw: 'Mapendekezo Karibu',    luo: 'Ma cok kedwu' },
  'ed.tipTitle':        { en: 'Tip for Employers',           lg: 'Amagezi ku Bagwanika',  sw: 'Kidokezo kwa Waajiri',  luo: 'Ngec bot lula cul' },
  'ed.tipBody':         { en: 'Adding a photo of your job site increases worker trust by 40%.', lg: 'Ongeramu ekifaananyi ky’ekifo ky’omulimu, bafundi bakyuusa obwesige 40%.', sw: 'Kuweka picha ya eneo la kazi huongeza uaminifu wa mafundi kwa 40%.', luo: 'Keto cal me kabedo me tic meda gen bafundi ki 40%.' },
  'ed.totalJobs':       { en: 'Total Jobs',                  lg: 'Emirimu Gyonna',        sw: 'Jumla ya Kazi',         luo: 'Tic Weng' },
  'ed.activeLabel':     { en: 'Active',                      lg: 'Egikolebwa',            sw: 'Zinaendelea',           luo: 'Ma tye ka cita' },

  // ── Job detail ─────────────────────────────────────────
  'job.pay':            { en: 'Pay',                         lg: 'Ensasule',              sw: 'Malipo',                luo: 'Cul' },
  'job.location':       { en: 'Location',                    lg: 'Ekifo',                 sw: 'Eneo',                  luo: 'Kabedo' },
  'job.completed':      { en: 'Completed',                   lg: 'Gwedde',                sw: 'Imekamilika',           luo: 'Otum' },
  'job.inProgress':     { en: 'In Progress',                 lg: 'Gugenda mu maaso',      sw: 'Inaendelea',            luo: 'Tye ka mede' },
  'job.notFound':       { en: 'Job not found',               lg: 'Omulimu tegulabise',    sw: 'Kazi haijapatikana',    luo: 'Tic pe ononge' },
  'job.goBack':         { en: 'Go Back',                     lg: 'Dda Emabega',           sw: 'Rudi Nyuma',            luo: 'Dok Cen' },
  'job.urgent':         { en: 'Urgent',                      lg: 'Ky’amangu',             sw: 'Haraka',                luo: 'Oyot' },
  'job.scheduled':      { en: 'Scheduled',                   lg: 'Kyategekeddwa',         sw: 'Imepangwa',             luo: 'Kiyubo' },
  'job.immediate':      { en: 'Immediate',                   lg: 'Kakati',                sw: 'Mara moja',             luo: 'Kombedi' },
  'job.postedBy':       { en: 'Posted by {name}',            lg: 'Omulimu guwereereddwa {name}', sw: 'Imetangazwa na {name}', luo: '{name} aye oyabo' },
  'job.workers':        { en: 'Workers',                     lg: 'Bafundi',               sw: 'Wafanyakazi',           luo: 'Bafundi' },
  'job.workersNeeded':  { en: '{n} needed',                  lg: 'beetagisa {n}',         sw: '{n} wanahitajika',      luo: 'kimito {n}' },
  'job.when':           { en: 'When',                        lg: 'Lwhena',                sw: 'Lini',                  luo: 'Kare' },
  'job.where':          { en: 'Where',                       lg: 'Wali',                  sw: 'Wapi',                  luo: 'Kampo' },
  'job.photos':         { en: 'Job Photos',                  lg: 'Ebifaananyi by’Omulimu', sw: 'Picha za Kazi',        luo: 'Cal me Tic' },
  'job.description':    { en: 'Description',                 lg: 'Ebikwata Ku Mulimu',    sw: 'Maelezo',               luo: 'Nyut' },
  'job.skillsNeeded':   { en: 'Skills Needed',               lg: 'Eby’amagezi Ebitegekeddwa', sw: 'Ujuzi Unaohitajika', luo: 'Ngec ma Kimito' },
  'job.employer':       { en: 'Employer',                    lg: 'Omuwesi',               sw: 'Mwajiri',               luo: 'Lula Cul' },
  'job.phoneLocked':    { en: 'Phone unlocks after payment is held in escrow', lg: 'Ssimu egulikira ssasula zikakasiddwa', sw: 'Simu itafunguka malipo yakiwa yameshikiliwa', luo: 'Simu bijabo ka gucul' },
  'job.applicants':     { en: 'Applicants ({n})',            lg: 'Abasabye ({n})',        sw: 'Waombaji ({n})',        luo: 'Jo ma openyo ({n})' },
  'job.jobsCount':      { en: '({n} jobs)',                  lg: '(emirimu {n})',         sw: '(kazi {n})',            luo: '(tic {n})' },
  'job.accepted':       { en: 'Accepted',                    lg: 'Okkirizza',             sw: 'Amekubaliwa',           luo: 'Giyee' },
  'job.accept':         { en: 'Accept',                      lg: 'Kkiriza',               sw: 'Kubali',                luo: 'Yee' },
  'job.noApplicants':   { en: 'No applicants yet',           lg: 'Tewali abasabye',       sw: 'Bado hakuna waombaji',  luo: 'Pe tye jo ma openyo' },
  'job.noApplicantsSub': { en: 'Workers nearby are being notified', lg: 'Bafundi ab’okumpi bateegekeddwa', sw: 'Mafundi wa karibu wanaarifiwa', luo: 'Bafundi ma cok giyeyo gi ngec' },
  'job.markComplete':   { en: 'Mark Job as Complete',        lg: 'Omulimu Gwedde',        sw: 'Kazi Imekamilika',      luo: 'Tic Otum' },
  'job.rebook':         { en: 'Book this fundi again',       lg: 'Ddamu ogwanike fundi ono', sw: 'Mwajiri fundi huyu tena', luo: 'Doki cul fundi man' },
  'job.inviting':       { en: 'Inviting fundi…',             lg: 'Fundi ayitibwa…',       sw: 'Inamwalika fundi…',     luo: 'Tye ka lwongo fundi…' },
  'job.repeatAuto':     { en: 'Repeat automatically:',       lg: 'Ddamu bugolokoka:',     sw: 'Rudia kiotomatiki:',    luo: 'Nwoŋ pire kene:' },
  'job.weekly':         { en: 'Weekly',                      lg: 'Buli wiiki',            sw: 'Kila wiki',             luo: 'Bili wiiki' },
  'job.biweekly':       { en: 'Every 2 weeks',               lg: 'Buli wiiki 2',          sw: 'Kila wiki 2',           luo: 'Wiiki 2' },
  'job.recurringWeekly': { en: 'Set! This fundi will be invited back every week.', lg: 'Kigenda! Fundi ono ajja kuyitibwa buli wiiki.', sw: 'Imewekwa! Fundi huyu ataalikwa kila wiki.', luo: 'Oyub! Fundi man bilwongi bili wiiki.' },
  'job.recurringBiweekly': { en: 'Set! This fundi will be invited back every 2 weeks.', lg: 'Kigenda! Fundi ono ajja kuyitibwa buli wiiki 2.', sw: 'Imewekwa! Fundi huyu ataalikwa kila wiki 2.', luo: 'Oyub! Fundi man bilwongi wiiki 2.' },
  'job.recurringError': { en: 'Could not set up the recurring booking.', lg: 'Tetutusobose kutegeka okuddamu.', sw: 'Haikuweza kuweka ratiba ya kurudia.', luo: 'Pe twero yubo nwono.' },
  'job.rebookError':    { en: 'Could not re-book this fundi. Please try again.', lg: 'Tetutusobose kuddamu okugwanika fundi ono. Gezaako nate.', sw: 'Haikuweza kumwalika fundi huyu tena. Jaribu tena.', luo: 'Pe twero cwalo fundi man doki. Tem doki.' },
  'job.msgEmployer':    { en: 'Message Employer',            lg: 'Muweereze Omuwesi',     sw: 'Mtumie Mwajiri',        luo: 'Cwalo kwena bot lula cul' },
  'job.callEmployer':   { en: 'Call Employer',               lg: 'Kuba Omuwesi Ssimu',    sw: 'Mpigie Mwajiri',        luo: 'Go simu bot lula cul' },

  // ── Post job ───────────────────────────────────────────
  'pj.newListing':      { en: 'New Listing',                 lg: 'Omulimu Omupya',        sw: 'Kazi Mpya',             luo: 'Tic Manyen' },
  'pj.headline':        { en: 'What needs doing?',           lg: 'Kiki ekibeetaggisa?',   sw: 'Kazi gani inahitajika?', luo: 'Tic me ngo kimito?' },
  'pj.titleLabel':      { en: 'Job Title *',                 lg: 'Omutwe gw’Omulimu *',   sw: 'Kichwa cha Kazi *',     luo: 'Wi Tic *' },
  'pj.titlePlaceholder': { en: 'e.g. Need 2 people for home cleaning', lg: 'Nga: Nneetaaga abantu 2 okuyonja eka', sw: 'Mf. Nahitaji watu 2 wa usafi wa nyumbani', luo: 'Cal: Amito jo 2 me cwiyo oto' },
  'pj.descLabel':       { en: 'Description',                 lg: 'Ebikwata Ku Mulimu',    sw: 'Maelezo',               luo: 'Nyut tic' },
  'pj.descPlaceholder': { en: 'Describe the tasks, specific requirements, and any tools needed...', lg: 'Nyonyola emirimu, ebyetaagisa, n’ebikozesebwa...', sw: 'Eleza kazi, mahitaji, na zana zinazohitajika...', luo: 'Nyut tic, gin ma kimito, ki git ma keto tic...' },
  'pj.locationLabel':   { en: 'Location *',                  lg: 'Ekifo *',               sw: 'Eneo *',                luo: 'Kabedo *' },
  'pj.locationPlaceholder': { en: 'Street address or neighborhood', lg: 'Oluwuba oba ekifo', sw: 'Mtaa au eneo',       luo: 'Yoo onyo kabedo' },
  'pj.dateTimeLabel':   { en: 'Date and Time',               lg: 'Ennaku n’Essawa',       sw: 'Tarehe na Muda',        luo: 'Nino ceng ki kare' },
  'pj.workersLabel':    { en: 'Number of Workers',           lg: 'Bafundi Abasinga Obungi', sw: 'Idadi ya Wafanyakazi', luo: 'Wel bafundi ma kimito' },
  'pj.payLabel':        { en: 'Pay (Optional)',              lg: 'Ensasule (Si Ya Ddembe)', sw: 'Malipo (Si Lazima)',  luo: 'Cul (Pe Teko)' },
  'pj.payPlaceholder':  { en: 'Suggested pay amount',        lg: 'Ensasule gy’osuubira',  sw: 'Kiasi cha malipo',      luo: 'Wel cul ma itamo' },
  'pj.categoryLabel':   { en: 'Category',                    lg: 'Ekika',                 sw: 'Aina',                  luo: 'Kite' },
  'pj.photosLabel':     { en: 'Job Photos (optional)',       lg: 'Ebifaananyi (si bya ddembe)', sw: 'Picha za Kazi (si lazima)', luo: 'Cal me tic (pe teko)' },
  'pj.photosHint':      { en: 'Show workers what needs doing', lg: 'Laga bafundi ekiibetagisa', sw: 'Waonyeshe mafundi kazi inayohitajika', luo: 'Nyut bafundi tic ma kimito' },
  'pj.urgencyLabel':    { en: 'Job Urgency',                 lg: 'Obuyambi bw’Omulimu',   sw: 'Uharaka wa Kazi',       luo: 'Dwe tic' },
  'pj.posting':         { en: 'Posting...',                  lg: 'Kuweereza...',          sw: 'Inatangaza...',         luo: 'Tye ka yabo...' },
  'pj.postNow':         { en: 'Post Job Now',                lg: 'Yatula Omulimu Kati',   sw: 'Tangaza Kazi Sasa',     luo: 'Yab Tic Kombedi' },
  'pj.successTitle':    { en: 'Job Posted!',                 lg: 'Omulimu Guwereereddwa!', sw: 'Kazi Imetangazwa!',    luo: 'Tic Oyub!' },
  'pj.successSub':      { en: 'Workers in your area are being notified right now.', lg: 'Bafundi mu kitundu kyo bateegekeddwa kakano.', sw: 'Mafundi wa eneo lako wanaarifiwa sasa hivi.', luo: 'Bafundi i kabedo mera giyeyo gi ngec kombedi.' },
  'pj.edit':            { en: 'Edit job',                    lg: 'Kyusa omulimu',         sw: 'Hariri kazi',           luo: 'Lok tic' },
  'pj.editNote':        { en: 'You can edit while no fundi has been accepted yet.', lg: 'Osobola okukyusa nga tewali fundi yakkirizibwa.', sw: 'Unaweza kuhariri kabla mfundi hajakubaliwa.', luo: 'Irom loko ka fundi mo pe okwede.' },
  'pj.saveEdit':        { en: 'Save changes',                lg: 'Kuuma enkyukakyuka',    sw: 'Hifadhi mabadiliko',    luo: 'Gwok alokoloka' },
  'pj.editSaved':       { en: 'Job updated!',                lg: 'Omulimu gukyusiddwa!',  sw: 'Kazi imesasishwa!',     luo: 'Tic oloki!' },

  // ── Categories (display labels — stored values stay English) ──
  'cat.cleaning':       { en: 'Cleaning',                    lg: 'Okuyonja',              sw: 'Usafi',                 luo: 'Cwiyo' },
  'cat.plumbing':       { en: 'Plumbing',                    lg: 'Eby’amazzi',            sw: 'Mabomba',               luo: 'Paipe me pii' },
  'cat.electrical':     { en: 'Electrical',                  lg: 'Eby’amasanyalaze',      sw: 'Umeme',                 luo: 'Ceng dyel' },
  'cat.construction':   { en: 'Construction',                lg: 'Okuzimba',              sw: 'Ujenzi',                luo: 'Gedo' },
  'cat.movingDelivery': { en: 'Moving & Delivery',           lg: 'Okusindika n’Okutambuza', sw: 'Usafirishaji',        luo: 'Kwalo jami' },
  'cat.gardening':      { en: 'Gardening',                   lg: 'Ennimiro',              sw: 'Bustani',               luo: 'Pido' },
  'cat.painting':       { en: 'Painting',                    lg: 'Eby’emiranga',          sw: 'Kupaka Rangi',          luo: 'Pwono' },
  'cat.cookingCatering': { en: 'Cooking & Catering',         lg: 'Okufumba n’Ebyokulya',  sw: 'Kupika',                luo: 'Tedo' },
  'cat.security':       { en: 'Security',                    lg: 'Okusoma',               sw: 'Ulinzi',                luo: 'Gwoko' },
  'cat.driving':        { en: 'Driving',                     lg: 'Okuvuga',               sw: 'Udereva',               luo: 'Moko gidya' },
  'cat.events':         { en: 'Events',                      lg: 'Eby’embaga',            sw: 'Matukio',               luo: 'Kare me kwero' },
  'cat.tailoring':      { en: 'Tailoring',                   lg: 'Okutunga',              sw: 'Ushonaji',              luo: 'Tung' },
  'cat.technical':      { en: 'Technical Repair',            lg: 'Eby’ekikugu',           sw: 'Ufundi wa Kiufundi',    luo: 'Tic tekniki' },
  'cat.farming':        { en: 'Farming',                     lg: 'Obulimi',               sw: 'Kilimo',                luo: 'Kot' },
  'cat.beauty':         { en: 'Beauty & Wellness',           lg: 'Obwanga',               sw: 'Urembo',                luo: 'Maber' },
  'cat.other':          { en: 'Other',                       lg: 'Ebirala',               sw: 'Nyingine',              luo: 'Mukene' },
  'cat.moving':         { en: 'Moving',                      lg: 'Okutambuza',            sw: 'Uhamaishaji',           luo: 'Kwalo' },
  'cat.cooking':        { en: 'Cooking',                     lg: 'Okufumba',              sw: 'Kupika',                luo: 'Tedo' },
  'cat.logistics':      { en: 'Logistics',                   lg: 'Okusindika',            sw: 'Usafiri',               luo: 'Kwalo jami' },

  // ── FundiFinder ────────────────────────────────────────
  'ff.locBrowser':      { en: 'Your browser does not support location — type your area instead.', lg: 'Oburawuzi bwo tebutegeera ekifo — wandika ekifo kyo.', sw: 'Kivinjari chako hakitumii eneo — andika eneo lako.', luo: 'Brawuca mera pe ngeyo kabedo — ket kabedo mera.' },
  'ff.locNoName':       { en: 'Could not name your area — please type it instead.', lg: 'Tetutusobose kumanya erinnya ly’ekifo kyo — ki wandike.', sw: 'Hatukuweza kupata jina la eneo lako — liandike.', luo: 'Pe wangeyo nying kabedo mera — ki cit.' },
  'ff.locFailed':       { en: 'Location lookup failed — please type your area instead.', lg: 'Okunoonya ekifo kuyizemu — wandika ekifo kyo.', sw: 'Utafutaji wa eneo umeshindwa — andika eneo lako.', luo: 'Yeny kabedo pe otemo — ket kabedo mera.' },
  'ff.locDenied':       { en: 'Location permission denied — please type your area instead.', lg: 'Okuzikiriza ekifo kugaaniddwa — wandika ekifo kyo.', sw: 'Ruhusa ya eneo imekataliwa — andika eneo lako.', luo: 'Yee kabedo pe — ket kabedo mera.' },
  'ff.showingNear':     { en: 'Showing fundis near {area}',  lg: 'Bafundi ab’okumpi ne {area}', sw: 'Inaonyesha mafundi karibu na {area}', luo: 'Tye ka nyuto bafundi cok ki {area}' },
  'ff.noneInArea':      { en: 'No fundis found in {area} yet', lg: 'Tewali bafundi abasangiddwa mu {area}', sw: 'Bado hakuna mafundi {area}', luo: 'Bafundi pe ononge i {area}' },
  'ff.noneYet':         { en: 'No fundis registered yet',    lg: 'Tewali bafundi abawandiikiddwa', sw: 'Bado hakuna mafundi waliosajiliwa', luo: 'Bafundi pe gicwalo nyinggi' },
  'ff.postInstead':     { en: 'Post a job instead — fundis nearby will be notified as they join.', lg: 'Yatula omulimu — bafundi ab’okumpi bajja kutegekedwa nga bajjira.', sw: 'Tangaza kazi badala yake — mafundi wa karibu wataarifiwa wanapojiunga.', luo: 'Yab tic — bafundi ma cok biyejo ngec ka gubino.' },
  'ff.reliability':     { en: 'Reliability: {score}',        lg: 'Obwesigika: {score}',   sw: 'Uaminifu: {score}',     luo: 'Gen: {score}' },
  'ff.useMyLocation':   { en: 'Use my current location',     lg: 'Kozesa ekifo kyaange',  sw: 'Tumia eneo langu',      luo: 'Tic ki kabedo mera' },

  // ── Tukola Guarantee (completed-job claim block) ───────
  'gc.title':           { en: 'Tukola Guarantee',            lg: 'Tukola Guarantee',      sw: 'Tukola Guarantee',      luo: 'Tukola Guarantee' },
  'gc.subtitle':        { en: 'Something went wrong with this job? File a claim — refunds up to UGX 200,000 from our guarantee reserve.', lg: 'Waliwo ekyazibu ku mulimu guno? Saba — addizibwa ensimbi okutuuka UGX 200,000.', sw: 'Kuna tatizo na kazi hii? Fungua dai — rudishiwa hadi UGX 200,000 kutoka akiba yetu.', luo: 'Gin obalo i tic man? Ket can — biculi cen wot UGX 200,000.' },
  'gc.stSubmitted':     { en: 'Submitted — awaiting review', lg: 'Osiibye — kulindirirwa okukeberwa', sw: 'Imewasilishwa — inasubiri ukaguzi', luo: 'Okeci — kuro neno' },
  'gc.stReview':        { en: 'Under review by our team',    lg: 'Timu yaffe ekukebera',  sw: 'Inakaguliwa na timu yetu', luo: 'Tim mera tye ka neno' },
  'gc.stRedo':          { en: 'Approved — we will arrange a re-do', lg: 'Kikkiriziddwa — tuliramulira okuddamu', sw: 'Imeidhinishwa — tutaandaa kurudiwa', luo: 'Giyee — biyubo tic doki' },
  'gc.stRefund':        { en: 'Approved — refund from the guarantee reserve', lg: 'Kikkiriziddwa — ensimbi ziraddizibwa', sw: 'Imeidhinishwa — rudisho la pesa', luo: 'Giyee — biculi cen' },
  'gc.stRejected':      { en: 'Rejected',                    lg: 'Kugaaniddwa',           sw: 'Imekataliwa',           luo: 'Gijuki' },
  'gc.approvedAmount':  { en: 'Approved amount: UGX {amount}', lg: 'Ensasule ezikiriziddwa: UGX {amount}', sw: 'Kiasi kilichoidhinishwa: UGX {amount}', luo: 'Cul ma giyee: UGX {amount}' },
  'gc.note':            { en: 'Note: {note}',                lg: 'Manya: {note}',         sw: 'Kumbuka: {note}',       luo: 'Ngec: {note}' },
  'gc.fileClaim':       { en: 'File a guarantee claim',      lg: 'Saba obuwanika',        sw: 'Fungua dai la dhamana', luo: 'Ket can' },
  'gc.placeholder':     { en: 'What went wrong? (e.g. the work was left unfinished, damage was caused…)', lg: 'Kiki ekyazibu? (nga: omulimu teguwedde, waliwo okukosa…)', sw: 'Kilienda vibaya? (mf. kazi haikukamilika, uharibifu…)', luo: 'Ngo obalo? (cal: tic pe otum, gin obale…)' },
  'gc.photoNote':       { en: 'Photo upload is coming soon — for now our team may ask you for photos on WhatsApp.', lg: 'Okuteeka ebifaananyi kijja — kati abakozi baffe basobola okukusaba ku WhatsApp.', sw: 'Upakiaji wa picha unakuja — kwa sasa timu yetu inaweza kukuomba picha WhatsApp.', luo: 'Keto cal biro — kombedi tim mera twero penyi cal i WhatsApp.' },
  'gc.submitError':     { en: 'Could not submit the claim. Please try again.', lg: 'Tetutusobose kusaba. Gezaako nate.', sw: 'Dai halikuweza kuwasilishwa. Jaribu tena.', luo: 'Pe twero keto can. Tem doki.' },
  'gc.submitting':      { en: 'Submitting…',                 lg: 'Kuweereza…',            sw: 'Inawasilisha…',         luo: 'Tye ka keto…' },
  'gc.submit':          { en: 'Submit claim',                lg: 'Saba',                  sw: 'Wasilisha dai',         luo: 'Ket can' },

  // ── Invite & earn (referral block) ─────────────────────
  'ie.title':           { en: 'Invite & earn',               lg: 'Yita & ofune',          sw: 'Alika & upate',         luo: 'Lwong & nong' },
  'ie.howCustomer':     { en: 'Invite a household — when their first paid job completes, you both get UGX {amount} credit off Tukola commission.', lg: 'Yita amaka — omulimu gwabwe ogusoose bwe gujjukira, mwembi mufuna UGX {amount}.', sw: 'Mwalike familia — kazi yao ya kwanza ikikamilika, nyote mnapata UGX {amount}.', luo: 'Lwong gang — ticgi me munyu ka otum, wun weng inongo UGX {amount}.' },
  'ie.howFundi':        { en: 'Invite a fundi — when they complete their first paid job, you get UGX {a} and they get UGX {b} credit.', lg: 'Yita fundi — omulimu gwe ogusoose bwe gujjukira, ofuna UGX {a} era naye afuna UGX {b}.', sw: 'Mwalike fundi — kazi yake ya kwanza ikikamilika, unapata UGX {a} na yeye UGX {b}.', luo: 'Lwong fundi — ticge me munyu ka otum, inong UGX {a} en ono UGX {b}.' },
  'ie.shareText':       { en: 'Join me on Tukola — find trusted fundis in Kampala (or get hired). Use my referral code {code}: {link}', lg: 'Nnagira ku Tukola — funa bafundi abeesigika mu Kampala (oba ogwanike). Kozesa koodi yange {code}: {link}', sw: 'Nijiunge kwenye Tukola — pata mafundi waaminifu Kampala (au uajiriwe). Tumia msimbo wangu {code}: {link}', luo: 'Bin waa i Tukola — nong bafundi ma gen i Kampala (onyo giculu). Tic ki kod mera {code}: {link}' },
  'ie.yourCode':        { en: 'Your code',                   lg: 'Koodi yo',              sw: 'Msimbo wako',           luo: 'Kod mera' },
  'ie.credit':          { en: 'Credit',                      lg: 'Ssente',                sw: 'Mkopo',                 luo: 'Kredit' },
  'ie.invited':         { en: 'Invited',                     lg: 'Abayitiddwa',           sw: 'Umealika',              luo: 'Ma ilwongo' },
  'ie.shareWhatsapp':   { en: 'Share on WhatsApp',           lg: 'Gaba ku WhatsApp',      sw: 'Shiriki WhatsApp',      luo: 'Nywak i WhatsApp' },

  // ── Image upload picker ────────────────────────────────
  'up.uploadFailed':    { en: 'Upload failed',               lg: 'Okuteeka kuyizemu',     sw: 'Upakiaji umeshindwa',   luo: 'Keto pe otemo' },
  'up.error':           { en: 'Error',                       lg: 'Kizibu',                sw: 'Hitilafu',              luo: 'Bal' },
  'up.addPhoto':        { en: 'Add photo',                   lg: 'Teekamu ekifaananyi',   sw: 'Ongeza picha',          luo: 'Med cal' },
  'up.addMore':         { en: 'Add more',                    lg: 'Ongeramu',              sw: 'Ongeza zaidi',          luo: 'Med mukene' },
  'up.counter':         { en: '{n} / {max} photos',          lg: 'ebifaananyi {n} / {max}', sw: 'picha {n} / {max}',   luo: 'cal {n} / {max}' },
  'up.uploadingAlt':    { en: 'Uploading',                   lg: 'Kuweereza',             sw: 'Inapakia',              luo: 'Tye ka keto' },

  // ── Worker services (fundis post priced listings) ──────
  'svc.title':          { en: 'My Services & Prices',        lg: 'Emirimu Gyange n’Ensimbi', sw: 'Huduma Zangu na Bei',  luo: 'Tic Mera ki Cullogi' },
  'svc.heroTitle':      { en: 'Set your prices, get booked directly', lg: 'Teeka emiwendo gyo, bakugwanike butereevu', sw: 'Weka bei zako, uajiriwe moja kwa moja', luo: 'Ket culli, giculi cut' },
  'svc.heroSub':        { en: 'Employers see your services and book you at YOUR price — no haggling before work starts.', lg: 'Abagwanika balaba emirimu gyo era bakugwanika ku mwendo GWO — tewali kubagana nga omulimu tegutandika.', sw: 'Waajiri wanaona huduma zako na kukuajiri kwa bei YAKO — hakuna ubishani kabla ya kazi.', luo: 'Lula culi neno tic mera ka giculi ki CUL MERA — ka laro pe onyo tic pe ocakke.' },
  'svc.emptyTitle':     { en: 'No services yet',             lg: 'Tolinawo mirimu',       sw: 'Bado hakuna huduma',    luo: 'Tic pud pe tye' },
  'svc.emptySub':       { en: 'Add your first service with a price so employers can book you directly.', lg: 'Teekamu omulimu gwo ogusoose n’omuwendo, abagwanika bakugwanike butereevu.', sw: 'Ongeza huduma yako ya kwanza na bei ili waajiri wakuajiri moja kwa moja.', luo: 'Med tic mera me munyu ki cul, wek lula culi giculi cut.' },
  'svc.addService':     { en: 'Add a service',               lg: 'Teekamu omulimu',       sw: 'Ongeza huduma',         luo: 'Med tic' },
  'svc.editService':    { en: 'Edit service',                lg: 'Kyusa omulimu',         sw: 'Badilisha huduma',      luo: 'Lok tic' },
  'svc.fieldTitle':     { en: 'Service name',                lg: 'Erinnya ly’omulimu',    sw: 'Jina la huduma',        luo: 'Nying tic' },
  'svc.fieldTitlePh':   { en: 'e.g. House cleaning, Braiding, Plumbing repairs', lg: 'Nga: okuyonja amaka, okusuka enviiri, okuddaabiriza payipu', sw: 'Mf. usafi wa nyumba, kusuka nywele, ufundishaji wa mabomba', luo: 'Cal: cwiyo ot, yedo ywe, yubo paip' },
  'svc.fieldCategory':  { en: 'Category',                    lg: 'Ekika',                 sw: 'Aina',                  luo: 'Kit' },
  'svc.fieldPrice':     { en: 'Price (UGX)',                 lg: 'Omwendo (UGX)',         sw: 'Bei (UGX)',             luo: 'Cul (UGX)' },
  'svc.fieldUnit':      { en: 'Unit (optional)',             lg: 'Ekigero (si ky’amateeka)', sw: 'Kipimo (si lazima)',   luo: 'Apim (pe woro)' },
  'svc.fieldUnitPh':    { en: 'e.g. per room',               lg: 'Nga: buli kisenge',     sw: 'Mf. kwa chumba',        luo: 'Cal: i ot acel acel' },
  'svc.fieldDesc':      { en: 'Description (optional)',      lg: 'Ebikwatako (si ky’amateeka)', sw: 'Maelezo (si lazima)', luo: 'Tito iye (pe woro)' },
  'svc.fieldDescPh':    { en: "What's included, what you bring…", lg: 'Kiki ekiri munda, kiki ky’oleeta…', sw: 'Nini kinachojumuishwa, unachochukua…', luo: 'Ngo ma tye iyie, ngo ma ibiro kede…' },
  'svc.publish':        { en: 'Publish service',             lg: 'Latula omulimu',        sw: 'Chapisha huduma',       luo: 'Yab tic' },
  'svc.edit':           { en: 'Edit',                        lg: 'Kyusa',                 sw: 'Badilisha',             luo: 'Lok' },
  'svc.hide':           { en: 'Hide from employers',         lg: 'Kweka abagwanika',      sw: 'Ficha kwa waajiri',     luo: 'Jo lula culi' },
  'svc.show':           { en: 'Show to employers',           lg: 'Laga abagwanika',       sw: 'Onyesha waajiri',       luo: 'Nyut lula culi' },
  'svc.hidden':         { en: 'Hidden',                      lg: 'Ekwese',                sw: 'Imefichwa',             luo: 'Ojowi' },
  'svc.confirmDelete':  { en: 'Remove "{title}"? Employers will no longer see it.', lg: 'Jja "{title}"? Abagwanika tebajja kugulaba nate.', sw: 'Ondoa "{title}"? Waajiri hataiona tena.', luo: 'Kwany "{title}"? Lula culi pe bineno ne doki.' },
  'svc.errTitle':       { en: 'Give your service a name',    lg: 'Wa omulimu gwo erinnya', sw: 'Ipe huduma yako jina',  luo: 'Cik tic mera nying' },
  'svc.errCategory':    { en: 'Choose a category',           lg: 'Londa ekika',           sw: 'Chagua aina',           luo: 'Yer kit' },
  'svc.errPrice':       { en: 'Enter a valid price',         lg: 'Wandika omuwendo omutuufu', sw: 'Weka bei sahihi',     luo: 'Ket cul ma atir' },
  'svc.templatesHint':  { en: 'Popular services in this category — tap one to fill the form:', lg: 'Emirimu egimanyiddwa mu kika kino — nyiga ekimu oyijule foomu:', sw: 'Huduma maarufu katika aina hii — gusa moja kujaza fomu:', luo: 'Tic ma ngene i kit man — piny acel wek opong pwodho:' },

  // ── Onboarding: first service step ─────────────────────
  'role.fsTitle':       { en: 'List your first service',     lg: 'Yatula omulimu gwo ogusoose', sw: 'Orodhesha huduma yako ya kwanza', luo: 'Yab tic mera me munyu' },
  'role.fsSub':         { en: 'Set one price now and employers can book you from today. You can add more later.', lg: 'Teeka omuwendo gumu kati, abagwanika bakugwanike okuva leero. Osobola okwongera oluvannyuma.', sw: 'Weka bei moja sasa na waajiri wanaweza kukuajiri kuanzia leo. Unaweza kuongeza zaidi baadaye.', luo: 'Ket cul acel kombedi, lula culi twero culi cakki eni. Ibiro medo mukene lacen.' },
  'role.fsPricePh':     { en: 'Your price (UGX)',            lg: 'Omwendo gwo (UGX)',     sw: 'Bei yako (UGX)',        luo: 'Culli (UGX)' },
  'role.fsPublish':     { en: 'Publish & start',             lg: 'Latula & otandike',     sw: 'Chapisha & anza',       luo: 'Yab & cak' },
  'role.fsSkip':        { en: 'Skip for now',                lg: 'Buuka kati',            sw: 'Ruka kwa sasa',         luo: 'Kal kombedi' },

  // ── Hire page: worker price list ───────────────────────
  'hire.priceList':     { en: "{name}'s services & prices",  lg: 'Emirimu n’emiwendo gya {name}', sw: 'Huduma na bei za {name}', luo: 'Tic ki cul me {name}' },
  'hire.priceListNote': { en: 'Book a listed service and the price is agreed up front — or describe your own job below.', lg: 'Gwanika omulimu ogutebeddwa, omuwendo mukkiriziganye dda — oba wandika omulimu gwo wansi.', sw: 'Ajira huduma iliyoorodheshwa na bei imekubaliwa mapema — au eleza kazi yako mwenyewe hapa chini.', luo: 'Cul tic ma kiyabo, cul giyee woko — onyo coc tic mera piny.' },

  // ── Service browser (employer marketplace) ─────────────
  'svcb.title':         { en: 'Services with set prices',    lg: 'Emirimu egy’emiwendo egimazze', sw: 'Huduma zenye bei zilizowekwa', luo: 'Tic ma cullogi kiset' },
  'svcb.subtitle':      { en: 'Book a fundi directly at their listed price — no haggling.', lg: 'Gwanika fundi butereevu ku mwendo gwe — tewali kubagana.', sw: 'Mwajiri fundi moja kwa moja kwa bei yake — hakuna ubishani.', luo: 'Cul fundi cut ki culge — ka laro pe.' },
  'svcb.searchPh':      { en: 'Search services… e.g. braiding', lg: 'Noonya emirimu… nga okusuka', sw: 'Tafuta huduma… mf. kusuka', luo: 'Yeny tic… cal yedo ywe' },
  'svcb.noneTitle':     { en: 'No services listed yet',      lg: 'Tewali mirimu egiyatuddwa', sw: 'Bado hakuna huduma zilizoorodheshwa', luo: 'Tic pud pe giyabo' },
  'svcb.noneSub':       { en: 'Fundis will list their services here. Post a job instead and they will apply.', lg: 'Bafundi bajja kuyatula emirimu gyabwe wano. Yatula omulimu bo bo basabe.', sw: 'Mafundi wataorodhesha huduma zao hapa. Tangaza kazi badala yake na wataomba.', luo: 'Bafundi biyab ticgi kany. Yab tic ka gi bipenyo.' },
  'svcb.book':          { en: 'Book at this price',          lg: 'Gwanika ku mwendo guno', sw: 'Ajira kwa bei hii',      luo: 'Cul ki cul man' },

  // ── Booking page ───────────────────────────────────────
  'book.title':         { en: 'Book this service',           lg: 'Gwanika omulimu guno',  sw: 'Ajira huduma hii',      luo: 'Cul tic man' },
  'book.notFound':      { en: 'This service is no longer available', lg: 'Omulimu guno teguliwo nate', sw: 'Huduma hii haipatikani tena', luo: 'Tic man pe tye doki' },
  'book.priceNote':     { en: "The fundi's listed price — agreed before work starts.", lg: 'Omuwendo fundi gwe yateeka — mukkiriziganye nga omulimu tegutandika.', sw: 'Bei aliyoweka fundi — imekubaliwa kabla ya kazi kuanza.', luo: 'Cul ma fundi oketo — giyee ka tic pe ocakke.' },
  'book.stagedNote':    { en: 'Paid in stages — your money is held safely and released as the work is completed.', lg: 'Osasula mu bitundu — ensimbi zo ziba zikuumiiddwa era zifulumizibwa nga omulimu bw’ogenda guweereza.', sw: 'Unalipa kwa hatua — pesa yako inahifadhiwa salama na kutolewa kazi inapoendelea.', luo: 'Iculli i boc — lim mera kigwoko maber ka kicwalo ne ka tic tye ka woto.' },
  'book.detailsTitle':  { en: 'Where and when?',             lg: 'Wawa era ddi?',         sw: 'Wapi na lini?',         luo: 'Kwene ki nino?' },
  'book.detailsSub':    { en: 'Tell {name} where the work is', lg: 'Tegeza {name} omulimu guli wa', sw: 'Mwambie {name} kazi iko wapi', luo: 'Nyut {name} kabedo me tic' },
  'book.location':      { en: 'Location',                    lg: 'Ekifo',                 sw: 'Eneo',                  luo: 'Kabedo' },
  'book.locationPh':    { en: 'e.g. Kira, near the market',  lg: 'Nga: Kira, okumpi n’akatale', sw: 'Mf. Kira, karibu na soko', luo: 'Cal: Kira, cok ki cuk' },
  'book.when':          { en: 'Date & time',                 lg: 'Olunaku n’essawa',      sw: 'Tarehe na muda',        luo: 'Nino ki cawa' },
  'book.notes':         { en: 'Notes (optional)',            lg: 'Ebikwatako (si ky’amateeka)', sw: 'Maelezo (si lazima)', luo: 'Coc (pe woro)' },
  'book.notesPh':       { en: 'e.g. 3 bedrooms, bring your own supplies', lg: 'Nga: ebiisenge 3, leeta ebikozesebwa byo', sw: 'Mf. vyumba 3, leta vifaa vyako', luo: 'Cal: ot 3, kel gin mamegi' },
  'book.urgency':       { en: 'Urgency',                     lg: 'Obuyangu',              sw: 'Uharaka',               luo: 'Oyot oyot' },
  'book.cta':           { en: 'Book for {price}',            lg: 'Gwanika ku {price}',    sw: 'Ajira kwa {price}',     luo: 'Cul ki {price}' },
  'book.sending':       { en: 'Booking…',                    lg: 'Kugenda mu maaso…',     sw: 'Inaajiri…',             luo: 'Tye ka culo…' },
  'book.sentTitle':     { en: 'Booking Sent!',               lg: 'Omulimu Gusabiddwa!',   sw: 'Ombi Limetumwa!',       luo: 'Penyo Ocit!' },
  'book.sentSub':       { en: '{name} has been invited at the listed price.', lg: '{name} ayitiddwa ku mwendo ogutebeddwa.', sw: '{name} amealikwa kwa bei iliyoorodheshwa.', luo: '{name} olwonge ki cul ma kiketo.' },
  'book.sentHint':      { en: 'The job starts the moment they accept. Opening the job…', lg: 'Omulimu gutandika bw’akkiriza. Tuggulawo omulimu…', sw: 'Kazi inaanza akikubali. Inafungua kazi…', luo: 'Tic cakke ka oyee. Tye ka yabo tic…' },
  'book.jobsDone':      { en: 'jobs done',                   lg: 'emirimu gye amaze',     sw: 'kazi alizokamilisha',   luo: 'tic ma otum' },

  // ── Worker profile: Mobile Money payout number ─────────
  'prof.payoutTitle':   { en: 'Mobile Money payout number',  lg: 'Namba ya Mobile Money gy’osasulirwa', sw: 'Namba ya Mobile Money ya malipo', luo: 'Namba me Mobile Money me cul' },
  'prof.payoutSub':     { en: 'Your pay is sent here when a job is completed.', lg: 'Ensimbi zo zikome wano nga omulimu guwedde.', sw: 'Malipo yako yanapelekwa hapa kazi ikikamilika.', luo: 'Cul mera bicito kany ka tic otum.' },
  'prof.payoutWarn':    { en: 'Add your MoMo number — without it we cannot pay you when a job is done.', lg: 'Teeka namba yo ya MoMo — nga tewali, tetusobola kukusasula nga omulimu guwedde.', sw: 'Weka namba yako ya MoMo — bila hiyo hatuwezi kukulipa kazi ikikamilika.', luo: 'Ket namba mera me MoMo — ka pe, pe wabiro culi ka tic otum.' },
  'prof.payoutPh':      { en: 'e.g. 0772 123 456',           lg: 'Nga: 0772 123 456',     sw: 'Mf. 0772 123 456',      luo: 'Cal: 0772 123 456' },
  'prof.payoutSave':    { en: 'Save number',                 lg: 'Kuuma namba',           sw: 'Hifadhi namba',         luo: 'Gwok namba' },
  'prof.payoutSaved':   { en: 'Saved!',                      lg: 'Ekuumiddwa!',           sw: 'Imehifadhiwa!',         luo: 'Kigwoko!' },

  // ── Escrow panel: unfunded-work nudges ─────────────────
  'esc.waitWorker':     { en: 'Heads up — the money isn’t secured yet. We’ll SMS you the moment it’s held. You can wait before starting.', lg: 'Kissa ku mutima — ssente tezinnaba kukuumibwa. Tujja kukutumira SMS ziba zikuumiddwa. Osobola okusubira nga tonnatandika.', sw: 'Kuwa makini — pesa bado haijahifadhiwa. Tutakutumia SMS mara itakapohifadhiwa. Unaweza kusubiri kabla ya kuanza.', luo: 'Piny odwi — lim pud pe ogwok. Wabicwali SMS ka kigwoko. Itwero rito ka tic pe ocakke.' },
  'esc.fundNudge':      { en: 'Secure the money now so work can start — it’s held safely until you confirm the job is done.', lg: 'Kuumya ssente kati omulimu gutandike — ziba zikuumiiddwa okutuusa lw’okakasa nti omulimu guwedde.', sw: 'Hifadhi pesa sasa ili kazi ianze — inahifadhiwa salama hadi uthibitishe kazi imekamilika.', luo: 'Gwok lim kombedi wek tic ocak — kigwoko ne maber nyaka iyee ni tic otum.' },

  // ── Verify page: SMS fallback ──────────────────────────
  'verify.noCode':      { en: "Didn't get the code?",        lg: 'Tofunye koodi?',        sw: 'Hukupata msimbo?',      luo: 'Pe inwang kod?' },
  'verify.whatsApp':    { en: 'Get help on WhatsApp',        lg: 'Funa obuyambi ku WhatsApp', sw: 'Pata msaada WhatsApp', luo: 'Yen kony i WhatsApp' },
  'verify.contactUs':   { en: 'Contact support',             lg: 'Tukwasagane',           sw: 'Wasiliana nasi',        luo: 'Riabwa' },

  // ── Off-platform (cash) settlement ─────────────────────
  'off.link':           { en: 'Settled outside the app?',    lg: 'Mumalirizza ebweru wa app?', sw: 'Mmekamilisha nje ya app?', luo: 'Otyeko woko i app?' },
  'off.title':          { en: 'Paying outside Tukola?',      lg: 'Osasula ebweru wa Tukola?', sw: 'Unalipa nje ya Tukola?', luo: 'Iculo woko pa Tukola?' },
  'off.b1':             { en: 'No payment protection — we never held the money', lg: 'Tewali kukuuma ssente — tetwazikuuma', sw: 'Hakuna ulinzi wa malipo — hatukuhifadhi pesa', luo: 'Gwoko lim pe — pe wagwoko lim' },
  'off.b2':             { en: 'No Tukola Guarantee if something goes wrong', lg: 'Tewali Tukola Guarantee bibaawo ebizibu', sw: 'Hakuna Tukola Guarantee ikitokea shida', luo: 'Tukola Guarantee pe tye ka ruch otime' },
  'off.b3':             { en: 'No receipt, no help if a dispute happens', lg: 'Tewali risiti oba obuyambi mu kubagana', sw: 'Hakuna risiti wala msaada kwa migogoro', luo: 'Risit onyo kony i bara pe tye' },
  'off.b4':             { en: "No rating — this job builds nobody's reputation", lg: 'Tewali rating — omulimu guno teguzimba kikwate kya muntu yenna', sw: 'Hakuna rating — kazi hii haitajenga sifa ya mtu yeyote', luo: 'Rating pe — tic man pe culo nying ngat' },
  'off.warn':           { en: 'Repeated cash deals can lead to account suspension.', lg: 'Okusasula mu cash emirundi emingi kusobola okusiba akawunti yo.', sw: 'Malipo ya cash mara kwa mara yanaweza kusitisha akaunti yako.', luo: 'Culo cash ki cene ki cene twero cuko account mero.' },
  'off.notePh':         { en: 'Optional note (e.g. paid cash on site)', lg: 'Ebikwatako (nga: twasuza ku site)', sw: 'Maelezo (mf. tumelipana cash)', luo: 'Coc (cal: waculo cash)' },
  'off.keep':           { en: 'Keep Tukola protection',      lg: 'Siga ku kukuuma kwa Tukola', sw: 'Endelea na ulinzi wa Tukola', luo: 'Med ki gwoko pa Tukola' },
  'off.confirm':        { en: 'Yes, we settled in cash',     lg: 'Yee, twasuza mu cash',  sw: 'Ndiyo, tumelipana cash', luo: 'Eyo, waculo cash' },
  'off.repeat':         { en: 'This is a repeat off-platform settlement on your account — the next one may lead to suspension.', lg: 'Gunno omurundi ogw’okusasula ebweru wa app ku akawunti yo — oguddiro gusobola okuleetera suspension.', sw: 'Hii ni marudio ya malipo nje ya app kwenye akaunti yako — inayofuata inaweza kusitisha akaunti yako.', luo: 'Man culo woko pa app doki i account mero — malubo twero cuko account mero.' },

  // ── Chat off-platform nudge ────────────────────────────
  'chat.leakNudge':     { en: 'Sharing numbers or paying outside Tukola means no payment protection, no guarantee and no receipt.', lg: 'Okugabana namba oba okusasula ebweru wa Tukola kitegeeza tewali kukuuma ssente, guarantee oba risiti.', sw: 'Kushiriki namba au kulipa nje ya Tukola kunamaanisha hakuna ulinzi wa malipo, guarantee wala risiti.', luo: 'Poko namba onyo culo woko pa Tukola nyiso ni gwoko lim, guarantee onyo risit pe tye.' },

  // ── Wallet ─────────────────────────────────────────────
  'wallet.title':       { en: 'My Wallet',                   lg: 'Wallet Yange',          sw: 'Wallet Yangu',          luo: 'Wallet Na' },
  'wallet.balance':     { en: 'Available balance',           lg: 'Ssente ziriwo',         sw: 'Salio lililopo',        luo: 'Lim ma tye' },
  'wallet.load':        { en: 'Load wallet',                 lg: 'Teeeza ssente',         sw: 'Weka pesa',             luo: 'Ket lim' },
  'wallet.loadTitle':   { en: 'Load your wallet',            lg: 'Teeza ssente mu wallet yo', sw: 'Weka pesa kwenye wallet yako', luo: 'Ket lim i wallet mera' },
  'wallet.amountPh':    { en: 'Amount (UGX)',                lg: 'Omuwendo (UGX)',        sw: 'Kiasi (UGX)',           luo: 'Cul (UGX)' },
  'wallet.phonePh':     { en: 'MoMo number',                 lg: 'Namba ya MoMo',         sw: 'Namba ya MoMo',         luo: 'Namba me MoMo' },
  'wallet.loadCta':     { en: 'Load via MoMo',               lg: 'Teeza nga MoMo',        sw: 'Weka kwa MoMo',         luo: 'Ket ki MoMo' },
  'wallet.waiting':     { en: 'Check your phone — enter your MoMo PIN to approve.', lg: 'Keera ku ssimu yo — yingiza PIN yo okakasa.', sw: 'Angalia simu yako — weka PIN yako kuthibitisha.', luo: 'Nen cim mera — ket PIN mero me moko.' },
  'wallet.success':     { en: 'Wallet loaded!',              lg: 'Ssente zitussiddwa!',   sw: 'Pesa imewekwa!',        luo: 'Lim ooko!' },
  'wallet.failed':      { en: 'The debit was declined or timed out.', lg: 'Okusasula kugaanye oba kiseera kyewedde.', sw: 'Malipo yamekataliwa au muda umeisha.', luo: 'Culo okwero onyo cawa orum.' },
  'wallet.history':     { en: 'History',                     lg: 'Ebyafaayo',             sw: 'Historia',              luo: 'Gin ma otime' },
  'wallet.empty':       { en: 'No transactions yet',         lg: 'Tewali nsasula na emu', sw: 'Hakuna miamala bado',   luo: 'Gin mo pe otime' },
  'wallet.note':        { en: 'Wallet money pays for jobs instantly — no PIN each time. Refunds come back here.', lg: 'Ssente za wallet zisasula omulimu amangwago — tewali PIN buli lwe osasula. Zizzaayo wano.', sw: 'Pesa ya wallet hulipa kazi mara moja — hakuna PIN kila mara. Marejesho yanarudi hapa.', luo: 'Lim me wallet culo tic cut — PIN pe ki cene. Lim ma gigo dok kany.' },
  'wallet.pendingTopup': { en: 'Waiting for PIN approval…',  lg: 'Tulinde okukakasa kwa PIN…', sw: 'Inasubiri idhini ya PIN…', luo: 'Tye ka rito moko me PIN…' },
  'wallet.kind.topup':  { en: 'Top-up',                      lg: 'Okuteeka ssente',       sw: 'Kuweka pesa',           luo: 'Keto lim' },
  'wallet.kind.job_funding': { en: 'Job payment',            lg: 'Okusasula omulimu',     sw: 'Malipo ya kazi',        luo: 'Cul me tic' },
  'wallet.kind.refund': { en: 'Refund',                      lg: 'Okuzza ssente',         sw: 'Marejesho',             luo: 'Dwogo lim' },
  'wallet.kind.adjustment': { en: 'Adjustment',              lg: 'Okutereeza',            sw: 'Marekebisho',           luo: 'Yubo' },
  'wallet.kind.earnings': { en: 'Job earnings',              lg: 'Empeera y\'omulimu',    sw: 'Mapato ya kazi',        luo: 'Cul me tic' },
  'wallet.kind.withdrawal': { en: 'Cash-out',                lg: 'Okujja ssente',         sw: 'Kutoa pesa',            luo: 'Golo lim' },
  'wallet.withdraw':      { en: 'Cash out to MoMo',          lg: 'Jja ssente ku MoMo',    sw: 'Toa pesa kwenda MoMo',  luo: 'Gol lim ci i MoMo' },
  'wallet.withdrawDone':  { en: 'Sent! Check your phone to approve.', lg: 'Bitumiddwa! Keera ku ssimu yo okakasa.', sw: 'Imetumwa! Angalia simu yako kuthibitisha.', luo: 'Ocito! Nen cim mero me moko.' },
  'wallet.feeTip':        { en: 'Tip: cashing out bigger sums at once means fewer MoMo fees.', lg: 'Amagezi: okujja ssente nyingi omulundi gumu kuggazaawo fees za MoMo.', sw: 'Kidokezo: kutoa pesa nyingi kwa mara moja hupunguza ada za MoMo.', luo: 'Ngec: golo lim madit cut kelo cul matidi i MoMo.' },
  'wallet.prefTitle':     { en: 'Where your pay goes',       lg: 'Empeera yo gy\'egenda', sw: 'Malipo yako yanaenda wapi', luo: 'Cul meri wot iye' },
  'wallet.prefMomo':      { en: 'Straight to Mobile Money',  lg: 'Ku Mobile Money dda',   sw: 'Moja kwa moja Mobile Money', luo: 'Ter i Mobile Money cut' },
  'wallet.prefWallet':    { en: 'Keep in my wallet',         lg: 'Zissa mu wallet yange', sw: 'Hifadhi kwenye wallet yangu', luo: 'Gwok i wallet na' },

  // ── Escrow: wallet funding ─────────────────────────────
  'esc.useWallet':      { en: 'Pay instantly from wallet',   lg: 'Sasula amangwago okuva mu wallet', sw: 'Lipa mara moja kutoka wallet', luo: 'Cul cut ki wallet' },
  'esc.walletLow':      { en: 'Wallet: {bal} — top up to skip the PIN next time', lg: 'Wallet: {bal} — teeka ssente oleme PIN omulundi oguddiro', sw: 'Wallet: {bal} — weka pesa uepuke PIN wakati ujao', luo: 'Wallet: {bal} — ket lim wek ikwany PIN i kare malubo' },
  'esc.walletFunded':   { en: 'Funded instantly from your wallet.', lg: 'Osasudde amangwago okuva mu wallet yo.', sw: 'Imefadhiliwa mara moja kutoka wallet yako.', luo: 'Ocule cut ki wallet mera.' },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof dict | string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: key => dict[key]?.en ?? key,
});

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('kola_lang');
    if (saved === 'en' || saved === 'lg' || saved === 'sw' || saved === 'luo') setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try { localStorage.setItem('kola_lang', next); } catch {}
  };

  const t = (key: string, vars?: Record<string, string | number>) =>
    interpolate(dict[key]?.[lang] ?? dict[key]?.en ?? key, vars);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Maps the English category labels stored in JOB_CATEGORIES / worker-home
 * CATEGORIES to their dict keys. Stored values stay English (matching,
 * skills arrays, API payloads); only the displayed label is translated.
 */
export const CATEGORY_I18N_KEYS: Record<string, string> = {
  'Cleaning': 'cat.cleaning',
  'Plumbing': 'cat.plumbing',
  'Electrical': 'cat.electrical',
  'Construction': 'cat.construction',
  'Moving & Delivery': 'cat.movingDelivery',
  'Gardening': 'cat.gardening',
  'Painting': 'cat.painting',
  'Cooking & Catering': 'cat.cookingCatering',
  'Security': 'cat.security',
  'Driving': 'cat.driving',
  'Events': 'cat.events',
  'Tailoring': 'cat.tailoring',
  'Technical Repair': 'cat.technical',
  'Farming': 'cat.farming',
  'Beauty & Wellness': 'cat.beauty',
  'Other': 'cat.other',
  'Moving': 'cat.moving',
  'Cooking': 'cat.cooking',
  'Logistics': 'cat.logistics',
};

/** Display label for an English category name in the active language. */
export function translateCategory(
  englishLabel: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const key = CATEGORY_I18N_KEYS[englishLabel];
  return key ? t(key) : englishLabel;
}
