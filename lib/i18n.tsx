'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * i18n — EN / Luganda (plan 1.2: language switch before any form).
 *
 * Lightweight, dependency-free (plan rule 5). The choice persists in
 * localStorage ('kola_lang'). Usage:
 *
 *   const { t, lang, setLang } = useI18n();
 *   <h1>{t('login.welcome')}</h1>
 *
 * Missing keys fall back to English, then to the key itself — a missing
 * translation can never crash or blank the UI.
 *
 * ⚠️ LUGANDA REVIEW: these translations are AI-drafted and MUST be reviewed
 * by a native Luganda speaker before public launch. They are marked here so
 * no one mistakes them for verified copy.
 */

export type Lang = 'en' | 'lg';

const dict: Record<string, { en: string; lg: string }> = {
  // ── Common ─────────────────────────────────────────────
  'common.continue':    { en: 'Continue',                    lg: 'Weeyongereyo' },
  'common.back':        { en: 'Back',                        lg: 'Dda emabega' },
  'common.loading':     { en: 'Loading…',                    lg: 'Lindako…' },
  'common.search':      { en: 'Search',                      lg: 'Noonya' },
  'common.cancel':      { en: 'Cancel',                      lg: 'Sazaamu' },
  'common.save':        { en: 'Save',                        lg: 'Kuuma' },

  // ── Onboarding ─────────────────────────────────────────
  'onboarding.next':    { en: 'Next',                        lg: 'Genda mu maaso' },
  'onboarding.skip':    { en: 'Skip',                        lg: 'Buuka' },
  'onboarding.getStarted': { en: 'Get Started',              lg: 'Tandika kati' },

  // ── Login ──────────────────────────────────────────────
  'login.welcome':      { en: 'Welcome back',                lg: 'Tukwaniriza nate' },
  'login.subtitle':     { en: 'Enter your phone number to continue', lg: 'Wandika ennamba yo ya ssimu weeyongereyo' },
  'login.codeHint':     { en: "We'll send a 6-digit verification code.", lg: 'Tujja kukusindikira koodi ya nnamba mukaaga (6).' },
  'login.invalidPhone': { en: 'Enter a valid 9-digit Uganda phone number', lg: 'Wandika ennamba ya ssimu ya Uganda entuufu (nnamba 9)' },
  'login.sendError':    { en: 'Could not send the code. Please try again.', lg: 'Koodi tezze. Gezaako nate.' },
  'login.networkError': { en: 'Network error. Please try again.', lg: 'Enkuutira yebyokugamba egyizeeko. Gezaako nate.' },
  'login.sending':      { en: 'Sending code...',             lg: 'Koodi esindikibwa…' },
  'login.tagline':      { en: 'Kampala’s fundi marketplace', lg: 'Akatale ka bafundi e Kampala' },
  'login.termsPrefix':  { en: 'By continuing, you agree to TUKOLA’s', lg: 'Bw’oweeyongereyo, okkiriza' },
  'login.terms':        { en: 'Terms',                       lg: 'Amateeka' },
  'login.privacy':      { en: 'Privacy Policy',              lg: 'Enkola y’Ekyama' },
  'login.and':          { en: '&',                           lg: 'ne' },

  // ── Verify ─────────────────────────────────────────────
  'verify.title':       { en: 'Enter verification code',     lg: 'Wandika koodi y’okukakasa' },
  'verify.subtitle':    { en: 'We sent a 6-digit code to',   lg: 'Tusindise koodi ya nnamba 6 ku' },
  'verify.verify':      { en: 'Verify',                      lg: 'Kakasa' },
  'verify.verifying':   { en: 'Verifying…',                  lg: 'Okukakasa kugenda mu maaso…' },
  'verify.resend':      { en: 'Resend code',                 lg: 'Ddamu osindike koodi' },
  'verify.wrongCode':   { en: 'Wrong code. Please try again.', lg: 'Koodi si ntuufu. Gezaako nate.' },
  'verify.demoCode':    { en: 'Demo code:',                  lg: 'Koodi ya demo:' },

  // ── Role select ────────────────────────────────────────
  'role.title':         { en: 'How will you use Tukola?',    lg: 'Ojja okozesa Tukola otya?' },
  'role.welcome':       { en: 'Welcome to TUKOLA',           lg: 'Tukwaniriza ku TUKOLA' },
  'role.choose':        { en: 'Choose how you want to use the platform today.', lg: 'Londa enkola gy’ojja okukozesa leero.' },
  'role.needWork':      { en: 'I need Work',                 lg: 'Njagala Omulimu' },
  'role.needWorkSub':   { en: 'Browse available jobs, apply for gigs, and earn money for your skills.', lg: 'Noonya emirimu egiliwo, osabe, ofune ensimbi ku bumanyirivu bwo.' },
  'role.wantHire':      { en: 'I want to Hire',              lg: 'Njagala Okugwanika' },
  'role.wantHireSub':   { en: 'Post a job description, find reliable workers, and get your tasks done.', lg: 'Yatula omulimu, onoonye bafundi abeesigika, emirimu gyo gikolebwe.' },
  'role.yourName':      { en: "What's your name?",           lg: 'Erinnya lyo ggyani?' },
  'role.nameSubWorker': { en: 'This is how employers will see you on TUKOLA.', lg: 'Abagwanika bwe balijja kukulaba ku TUKOLA.' },
  'role.nameSubEmployer': { en: 'This is how workers will see you on TUKOLA.', lg: 'Bafundi bwe balijja kukulaba ku TUKOLA.' },
  'role.welcomeWorker': { en: 'Welcome, Fundi!',             lg: 'Tukwaniriza, Fundi!' },
  'role.welcomeEmployer': { en: 'Welcome, Employer!',        lg: 'Tukwaniriza, Omuwesi!' },
  'role.setup':         { en: 'Setting up your account...',  lg: 'Akawunti yo eteekwateekwa…' },
  'role.changeRole':    { en: '← Change role',               lg: '← Kyuusa' },
  'role.secureNote':    { en: 'Every account is phone-verified', lg: 'Buli akawunti ekakasibwa ku ssimu' },
  'role.errorCreate':   { en: 'Could not create your account. Please verify your phone again.', lg: 'Akawunti yo teyakolebwa. Ddamu okakase ssimu yo.' },
  'role.worker':        { en: 'I want to work',              lg: 'Njagala okukola' },
  'role.workerSub':     { en: 'Find jobs and earn money',    lg: 'Noonya emirimu ofune ensimbi' },
  'role.employer':      { en: 'I want to hire',              lg: 'Njagala okugwanika' },
  'role.employerSub':   { en: 'Post jobs and find fundis',   lg: 'Yatula emirimu onoonye bafundi' },
  'role.name':          { en: 'Your name',                   lg: 'Erinnya lyo' },
  'role.namePlaceholder': { en: 'e.g. Amina Nakato',         lg: 'Nga: Amina Nakato' },
  'role.creating':      { en: 'Creating your account…',      lg: 'Akawunti yo eteekwateekwa…' },
  'role.finish':        { en: 'Start using Tukola',          lg: 'Tandika okozesa Tukola' },

  // ── Worker home ────────────────────────────────────────
  'worker.findJobs':    { en: 'Find Jobs',                   lg: 'Noonya Emirimu' },
  'worker.myJobs':      { en: 'My Jobs',                     lg: 'Emirimu Gyange' },
  'worker.messages':    { en: 'Messages',                    lg: 'Obubaka' },
  'worker.profile':     { en: 'Profile',                     lg: 'Profayiro' },
  'worker.apply':       { en: 'Apply for this Job',          lg: 'Saba Omulimu Guno' },
  'worker.applied':     { en: 'Applied Successfully',        lg: 'Osabye Bulungi' },
  'worker.acceptInvite': { en: 'Accept Invitation — Start Job', lg: 'Kkiriza Oluyita — Tandika Omulimu' },
  'worker.markDone':    { en: 'Mark as Done',                lg: 'Omulimu Gwedde' },

  // ── Employer home ──────────────────────────────────────
  'employer.postJob':   { en: 'Post a New Job',              lg: 'Yatula Omulimu Omupya' },
  'employer.myJobs':    { en: 'My Jobs',                     lg: 'Emirimu Gyange' },
  'employer.findFundis': { en: 'Find Fundis',                lg: 'Noonya Bafundi' },
  'employer.hire':      { en: 'Hire',                        lg: 'Gwanika' },
  'employer.topRated':  { en: 'Top Rated',                   lg: 'Asinga Obugeri' },
  'employer.bookAgain': { en: 'Book this fundi again',       lg: 'Ddamu ogwanike fundi ono' },
  'employer.nearMe':    { en: 'Near me',                     lg: 'Okumpi nange' },
  'employer.areaPlaceholder': { en: 'Type your area — e.g. Kololo, Ntinda, Kira', lg: 'Wandika ekifo ky’obeera — nga Kololo, Ntinda, Kira' },

  // ── Job detail ─────────────────────────────────────────
  'job.pay':            { en: 'Pay',                         lg: 'Ensasule' },
  'job.location':       { en: 'Location',                    lg: 'Ekifo' },
  'job.completed':      { en: 'Completed',                   lg: 'Gwedde' },
  'job.inProgress':     { en: 'In Progress',                 lg: 'Gugenda mu maaso' },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof dict | string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: key => dict[key]?.en ?? key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('kola_lang');
    if (saved === 'lg' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try { localStorage.setItem('kola_lang', next); } catch {}
  };

  const t = (key: string) => dict[key]?.[lang] ?? dict[key]?.en ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
