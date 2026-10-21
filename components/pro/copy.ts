import type { Lang } from '@/lib/i18n'

// Тексты окна входа в Pro на всех языках сайта (владелец 21.10.2026).
// Язык берётся из страницы, откуда пришли (?next), иначе английский.

export type ProCopy = {
  haveAccount: string
  logIn: string
  newHere: string
  signUp: string
  titleSignup: string
  titleLogin: string
  lead: string
  google: string
  email: string
  emailLabel: string
  send: string
  sending: string
  sent: (email: string) => string
  codeLabel: string
  verify: string
  checking: string
  other: string
  network: string
  googleFailed: string
  legalA: string
  terms: string
  legalB: string
  privacy: string
  back: string
  inTitle: string
  inLead: string
  browse: string
  continue: string
  signOut: string
}

export const PRO_COPY: Record<Lang, ProCopy> = {
  en: {
    haveAccount: 'Have an account?', logIn: 'Log in', newHere: 'New here?', signUp: 'Sign up',
    titleSignup: 'Create your free account', titleLogin: 'Welcome back',
    lead: 'Yield, demand and safety checks for every villa and apartment in Bali.',
    google: 'Continue with Google', email: 'Continue with Email', emailLabel: 'Your email',
    send: 'Send code', sending: 'Sending…', sent: e => `We sent a 6-digit code to ${e}.`,
    codeLabel: 'Code from the email', verify: 'Sign in', checking: 'Checking…', other: 'Use another email',
    network: 'No connection. Please try again.', googleFailed: 'Google sign-in did not go through. Please try again or use email.',
    legalA: 'By continuing, you agree to the', terms: 'Terms of Use', legalB: 'and have read the', privacy: 'Privacy Policy',
    back: 'Back', inTitle: 'You are in', inLead: 'Pro analytics is open on every villa and apartment page.',
    browse: 'Browse villas', continue: 'Back to the listing', signOut: 'Sign out',
  },
  ru: {
    haveAccount: 'Уже есть аккаунт?', logIn: 'Войти', newHere: 'Впервые здесь?', signUp: 'Создать аккаунт',
    titleSignup: 'Создайте бесплатный аккаунт', titleLogin: 'С возвращением',
    lead: 'Доходность, спрос и проверка безопасности по каждой вилле и апартаментам на Бали.',
    google: 'Войти через Google', email: 'Войти по почте', emailLabel: 'Ваша почта',
    send: 'Получить код', sending: 'Отправляем…', sent: e => `Мы отправили код из 6 цифр на ${e}.`,
    codeLabel: 'Код из письма', verify: 'Войти', checking: 'Проверяем…', other: 'Другая почта',
    network: 'Нет связи. Попробуйте ещё раз.', googleFailed: 'Вход через Google не прошёл. Попробуйте ещё раз или войдите по почте.',
    legalA: 'Продолжая, вы принимаете', terms: 'условия использования', legalB: 'и', privacy: 'политику конфиденциальности',
    back: 'Назад', inTitle: 'Вы вошли', inLead: 'Pro-аналитика открыта на странице каждой виллы и апартаментов.',
    browse: 'Смотреть виллы', continue: 'Вернуться к объекту', signOut: 'Выйти',
  },
  id: {
    haveAccount: 'Sudah punya akun?', logIn: 'Masuk', newHere: 'Baru di sini?', signUp: 'Daftar',
    titleSignup: 'Buat akun gratis', titleLogin: 'Selamat datang kembali',
    lead: 'Imbal hasil, permintaan, dan pemeriksaan keamanan untuk setiap vila dan apartemen di Bali.',
    google: 'Lanjutkan dengan Google', email: 'Lanjutkan dengan Email', emailLabel: 'Email Anda',
    send: 'Kirim kode', sending: 'Mengirim…', sent: e => `Kami mengirim kode 6 digit ke ${e}.`,
    codeLabel: 'Kode dari email', verify: 'Masuk', checking: 'Memeriksa…', other: 'Gunakan email lain',
    network: 'Tidak ada koneksi. Coba lagi.', googleFailed: 'Masuk dengan Google gagal. Coba lagi atau gunakan email.',
    legalA: 'Dengan melanjutkan, Anda menyetujui', terms: 'Ketentuan Penggunaan', legalB: 'dan telah membaca', privacy: 'Kebijakan Privasi',
    back: 'Kembali', inTitle: 'Anda sudah masuk', inLead: 'Analitik Pro terbuka di setiap halaman vila dan apartemen.',
    browse: 'Lihat vila', continue: 'Kembali ke properti', signOut: 'Keluar',
  },
  fr: {
    haveAccount: 'Déjà un compte ?', logIn: 'Se connecter', newHere: 'Nouveau ici ?', signUp: 'Créer un compte',
    titleSignup: 'Créez votre compte gratuit', titleLogin: 'Bon retour',
    lead: 'Rendement, demande et contrôles de sécurité pour chaque villa et appartement à Bali.',
    google: 'Continuer avec Google', email: 'Continuer avec un e-mail', emailLabel: 'Votre e-mail',
    send: 'Recevoir le code', sending: 'Envoi…', sent: e => `Nous avons envoyé un code à 6 chiffres à ${e}.`,
    codeLabel: "Code reçu par e-mail", verify: 'Se connecter', checking: 'Vérification…', other: 'Utiliser un autre e-mail',
    network: 'Pas de connexion. Réessayez.', googleFailed: "La connexion Google a échoué. Réessayez ou utilisez l'e-mail.",
    legalA: 'En continuant, vous acceptez les', terms: "Conditions d'utilisation", legalB: 'et avez lu la', privacy: 'Politique de confidentialité',
    back: 'Retour', inTitle: 'Vous êtes connecté', inLead: "L'analyse Pro est ouverte sur chaque page de villa et d'appartement.",
    browse: 'Voir les villas', continue: "Retour à l'annonce", signOut: 'Se déconnecter',
  },
  de: {
    haveAccount: 'Schon ein Konto?', logIn: 'Anmelden', newHere: 'Neu hier?', signUp: 'Registrieren',
    titleSignup: 'Kostenloses Konto erstellen', titleLogin: 'Willkommen zurück',
    lead: 'Rendite, Nachfrage und Sicherheitsprüfung für jede Villa und Wohnung auf Bali.',
    google: 'Weiter mit Google', email: 'Weiter mit E-Mail', emailLabel: 'Ihre E-Mail',
    send: 'Code senden', sending: 'Wird gesendet…', sent: e => `Wir haben einen 6-stelligen Code an ${e} gesendet.`,
    codeLabel: 'Code aus der E-Mail', verify: 'Anmelden', checking: 'Wird geprüft…', other: 'Andere E-Mail verwenden',
    network: 'Keine Verbindung. Bitte erneut versuchen.', googleFailed: 'Anmeldung mit Google fehlgeschlagen. Bitte erneut versuchen oder E-Mail nutzen.',
    legalA: 'Mit dem Fortfahren akzeptieren Sie die', terms: 'Nutzungsbedingungen', legalB: 'und haben die', privacy: 'Datenschutzerklärung gelesen',
    back: 'Zurück', inTitle: 'Sie sind angemeldet', inLead: 'Die Pro-Analyse ist auf jeder Villen- und Wohnungsseite offen.',
    browse: 'Villen ansehen', continue: 'Zurück zum Objekt', signOut: 'Abmelden',
  },
  zh: {
    haveAccount: '已有账户？', logIn: '登录', newHere: '第一次来？', signUp: '注册',
    titleSignup: '创建免费账户', titleLogin: '欢迎回来',
    lead: '巴厘岛每套别墅和公寓的收益率、需求和安全核查。',
    google: '使用 Google 继续', email: '使用邮箱继续', emailLabel: '您的邮箱',
    send: '发送验证码', sending: '发送中…', sent: e => `我们已向 ${e} 发送 6 位验证码。`,
    codeLabel: '邮件中的验证码', verify: '登录', checking: '验证中…', other: '使用其他邮箱',
    network: '网络不可用，请重试。', googleFailed: 'Google 登录未成功，请重试或使用邮箱。',
    legalA: '继续即表示您同意', terms: '使用条款', legalB: '并已阅读', privacy: '隐私政策',
    back: '返回', inTitle: '您已登录', inLead: '每套别墅和公寓页面的 Pro 分析已开放。',
    browse: '浏览别墅', continue: '返回房源', signOut: '退出登录',
  },
  nl: {
    haveAccount: 'Al een account?', logIn: 'Inloggen', newHere: 'Nieuw hier?', signUp: 'Account maken',
    titleSignup: 'Maak een gratis account', titleLogin: 'Welkom terug',
    lead: 'Rendement, vraag en veiligheidscontroles voor elke villa en elk appartement op Bali.',
    google: 'Doorgaan met Google', email: 'Doorgaan met e-mail', emailLabel: 'Uw e-mail',
    send: 'Code versturen', sending: 'Versturen…', sent: e => `We hebben een 6-cijferige code naar ${e} gestuurd.`,
    codeLabel: 'Code uit de e-mail', verify: 'Inloggen', checking: 'Controleren…', other: 'Ander e-mailadres',
    network: 'Geen verbinding. Probeer het opnieuw.', googleFailed: 'Inloggen met Google is mislukt. Probeer opnieuw of gebruik e-mail.',
    legalA: 'Door verder te gaan, gaat u akkoord met de', terms: 'Gebruiksvoorwaarden', legalB: 'en hebt u het', privacy: 'Privacybeleid gelezen',
    back: 'Terug', inTitle: 'U bent ingelogd', inLead: 'Pro-analyse staat open op elke villa- en appartementpagina.',
    browse: "Villa's bekijken", continue: 'Terug naar het object', signOut: 'Uitloggen',
  },
  ban: {
    haveAccount: 'Sampun madue akun?', logIn: 'Mlebu', newHere: 'Wawu iriki?', signUp: 'Daftar',
    titleSignup: 'Ngaryanin akun gratis', titleLogin: 'Rahajeng rauh malih',
    lead: 'Pikolih, paminat, miwah pamriksan kasalametan anggen sami vila lan apartemen ring Bali.',
    google: 'Lanturang sareng Google', email: 'Lanturang sareng Email', emailLabel: 'Email ragane',
    send: 'Kirim kode', sending: 'Ngirim…', sent: e => `Sampun kakirim kode 6 angka ka ${e}.`,
    codeLabel: 'Kode saking email', verify: 'Mlebu', checking: 'Mriksa…', other: 'Anggen email lianan',
    network: 'Nenten wenten koneksi. Cobin malih.', googleFailed: 'Mlebu sareng Google nenten prasida. Cobin malih utawi anggen email.',
    legalA: 'Yening nglanturang, ragane nyarujuin', terms: 'Ketentuan Panganggo', legalB: 'miwah sampun ngwacen', privacy: 'Kebijakan Privasi',
    back: 'Wangsul', inTitle: 'Ragane sampun mlebu', inLead: 'Analitik Pro kabuka ring sami kaca vila lan apartemen.',
    browse: 'Cingak vila', continue: 'Wangsul ka properti', signOut: 'Medal',
  },
  pl: {
    haveAccount: 'Masz już konto?', logIn: 'Zaloguj się', newHere: 'Pierwszy raz?', signUp: 'Załóż konto',
    titleSignup: 'Załóż darmowe konto', titleLogin: 'Witaj ponownie',
    lead: 'Rentowność, popyt i kontrola bezpieczeństwa każdej willi i apartamentu na Bali.',
    google: 'Kontynuuj z Google', email: 'Kontynuuj przez e-mail', emailLabel: 'Twój e-mail',
    send: 'Wyślij kod', sending: 'Wysyłanie…', sent: e => `Wysłaliśmy 6-cyfrowy kod na ${e}.`,
    codeLabel: 'Kod z e-maila', verify: 'Zaloguj się', checking: 'Sprawdzanie…', other: 'Użyj innego e-maila',
    network: 'Brak połączenia. Spróbuj ponownie.', googleFailed: 'Logowanie przez Google nie powiodło się. Spróbuj ponownie lub użyj e-maila.',
    legalA: 'Kontynuując, akceptujesz', terms: 'Warunki korzystania', legalB: 'i zapoznałeś się z', privacy: 'Polityką prywatności',
    back: 'Wstecz', inTitle: 'Jesteś zalogowany', inLead: 'Analityka Pro jest otwarta na stronie każdej willi i apartamentu.',
    browse: 'Zobacz wille', continue: 'Wróć do oferty', signOut: 'Wyloguj się',
  },
  uk: {
    haveAccount: 'Вже є акаунт?', logIn: 'Увійти', newHere: 'Вперше тут?', signUp: 'Створити акаунт',
    titleSignup: 'Створіть безкоштовний акаунт', titleLogin: 'З поверненням',
    lead: 'Дохідність, попит і перевірка безпеки кожної вілли та апартаментів на Балі.',
    google: 'Увійти через Google', email: 'Увійти поштою', emailLabel: 'Ваша пошта',
    send: 'Отримати код', sending: 'Надсилаємо…', sent: e => `Ми надіслали код із 6 цифр на ${e}.`,
    codeLabel: 'Код із листа', verify: 'Увійти', checking: 'Перевіряємо…', other: 'Інша пошта',
    network: "Немає зв'язку. Спробуйте ще раз.", googleFailed: 'Вхід через Google не вдався. Спробуйте ще раз або увійдіть поштою.',
    legalA: 'Продовжуючи, ви приймаєте', terms: 'умови використання', legalB: 'і', privacy: 'політику конфіденційності',
    back: 'Назад', inTitle: 'Ви увійшли', inLead: 'Pro-аналітика відкрита на сторінці кожної вілли та апартаментів.',
    browse: 'Дивитися вілли', continue: "Повернутися до об'єкта", signOut: 'Вийти',
  },
}

/** Ссылки на юридические страницы: русские свои, у остальных — английские. */
export function legalLinks(lang: Lang): { terms: string; privacy: string } {
  return lang === 'ru'
    ? { terms: '/ru/usloviya', privacy: '/ru/politika-konfidencialnosti' }
    : { terms: '/en/terms', privacy: '/en/privacy' }
}
