const fs = require("fs");

function patch(file, locale) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const fsObj = data.familySettings;
  const ar = locale === "ar";

  Object.assign(fsObj.account, {
    panelTitle: ar ? "بيانات وليّ الأمر" : "Parent account details",
    panelLead: ar
      ? "حدّث بيانات حسابك واللغة التي تفضّل استخدامها في رقيم."
      : "Update your account details and the language you prefer in Raqeem.",
    saveChanges: ar ? "حفظ التغييرات" : "Save changes",
    emailLabel: ar ? "البريد الإلكتروني" : "Email",
    phoneSoonTitle: ar ? "رقم الهاتف" : "Phone number",
    phoneSoonBody: ar
      ? "سيصبح تعديل رقم الهاتف متاحًا بعد تفعيل التحقق."
      : "Phone editing will be available after verification is enabled.",
  });

  Object.assign(fsObj.children, {
    panelTitle: ar ? "ملفات الأبناء" : "Children profiles",
    panelLead: ar
      ? "أدر ملفات أطفالك وانتقل إلى رحلة كل طفل من مكان واحد."
      : "Manage your children and open each child’s journey from one place.",
    emptyTitle: ar ? "لنبدأ بإضافة طفلك الأول" : "Let’s add your first child",
    emptyBody: ar
      ? "أنشئ ملف طفلك وحدد صفه ليبدأ مراجعة دروسه وبناء مقر مهنته."
      : "Create your child’s profile and choose a grade so they can start reviewing lessons and building their HQ.",
    addFirst: ar ? "إضافة طفلي الأول" : "Add my first child",
    openProfile: ar ? "فتح ملف الطفل" : "Open child profile",
    editData: ar ? "تعديل البيانات" : "Edit details",
    addCardTitle: ar ? "إضافة طفل جديد" : "Add a new child",
    addCardBody: ar
      ? "أنشئ ملفًا لطفل آخر وابدأ له رحلة مستقلة."
      : "Create another profile and start an independent journey.",
    completedLessons: ar ? "{count} دروس مكتملة" : "{count} lessons completed",
    activityToday: ar ? "أكمل درسًا اليوم" : "Completed a lesson today",
    activityNever: ar ? "لم يبدأ بعد" : "Has not started yet",
    activityOn: ar ? "آخر نشاط: {date}" : "Last activity: {date}",
    gradeUnknown: ar ? "الصف غير محدد" : "Grade not set",
    avatarFollowsProfession: ar
      ? "الصورة الرمزية تتبع المهنة المختارة حاليًا."
      : "The avatar currently follows the chosen profession.",
    professionLocked: ar
      ? "لا يمكن تغيير المهنة بعد بدء بناء المقر حاليًا."
      : "Profession cannot be changed after HQ building has started yet.",
    gradeConfirmed: ar ? "تم تأكيد فهم أثر تغيير الصف." : "Grade-change impact confirmed.",
  });

  Object.assign(fsObj.learning, {
    panelTitle: ar ? "خطة التعلّم" : "Learning plan",
    panelLead: ar
      ? "حدّد هدفًا أسبوعيًا مناسبًا لكل طفل دون أن تمنعه من إنجاز المزيد."
      : "Set a weekly goal for each child without blocking extra lessons.",
    needChildTitle: ar ? "أضف طفلًا أولًا" : "Add a child first",
    recommended: ar ? "مقترح" : "Suggested",
    currentGoal: ar ? "الهدف الحالي: {count} دروس أسبوعيًا" : "Current goal: {count} lessons per week",
    weekProgress: ar ? "أنجز هذا الأسبوع: {done} من {goal}" : "This week: {done} of {goal}",
    weekRange: ar ? "من {start} إلى {end}" : "From {start} to {end}",
    subjectsTitle: ar ? "المواد الحالية" : "Current subjects",
    subjectsEmpty: ar ? "لا توجد بيانات مواد لهذا الطفل بعد." : "No subject data for this child yet.",
    subjectAvailable: ar ? "متاحة" : "Available",
    subjectEmpty: ar ? "لم يُضف إليها محتوى بعد" : "No content yet",
    smartReviewTitle: ar ? "محطات المراجعة الذكية" : "Smart review stations",
    smartReviewBody: ar
      ? "ستستخدم رقيم أخطاء الطفل السابقة لإعادة تقديم أسئلة جديدة بالمصطلحات نفسها الموجودة في منهجه."
      : "Raqeem will reuse past mistakes to present new questions with the same curriculum terms.",
    customInvalid: ar ? "أدخل رقمًا بين 1 و 15." : "Enter a number from 1 to 15.",
    presets: {
      3: ar ? "خفيف: 3 دروس" : "Light: 3 lessons",
      5: ar ? "متوازن: 5 دروس" : "Balanced: 5 lessons",
      7: ar ? "نشط: 7 دروس" : "Active: 7 lessons",
    },
  });

  fsObj.reports = Object.assign({}, fsObj.reports || {}, {
    panelTitle: ar ? "تقارير التقدّم" : "Progress reports",
    panelLead: ar
      ? "تابع ما أنجزه طفلك وما يحتاج إلى مزيد من المراجعة."
      : "Follow what your child completed and what needs more review.",
    emptyTitle: ar ? "سيظهر تقرير طفلك بعد إكمال أول درس" : "Your child’s report appears after the first lesson",
    emptyBody: ar
      ? "عندما يبدأ طفلك المراجعة، ستظهر هنا معلومات عن تقدّمه ونشاطه."
      : "When your child starts reviewing, progress details will appear here.",
    weekLessons: ar ? "دروس هذا الأسبوع: {count}" : "Lessons this week: {count}",
    totalAnswers: ar ? "إجمالي الأسئلة المجاب عنها: {count}" : "Total answers: {count}",
    correctRate: ar ? "نسبة الإجابات الصحيحة: {percent}%" : "Correct answers: {percent}%",
    correctRateUnknown: ar ? "نسبة الإجابات الصحيحة: غير متاحة بعد" : "Correct-answer rate: not available yet",
    longestStreak: ar ? "أطول سلسلة أيام: {count}" : "Longest streak: {count} days",
    mostActive: ar ? "المادة الأكثر نشاطًا: {name}" : "Most active subject: {name}",
    mostActiveUnknown: ar ? "المادة الأكثر نشاطًا: غير محددة بعد" : "Most active subject: not available yet",
    needsReview: ar ? "مادة تحتاج مراجعة: {name}" : "Needs review: {name}",
    needsReviewUnknown: ar ? "مادة تحتاج مراجعة: غير محددة بعد" : "Needs review: not available yet",
    lastActivity: ar ? "آخر نشاط: {date}" : "Last activity: {date}",
    detailedCta: ar ? "عرض التقرير التفصيلي" : "View detailed report",
    aiTitle: ar ? "تحليل ذكي لأداء طفلك" : "Smart analysis of your child’s performance",
    aiBody: ar
      ? "نعمل على تقرير يحلل نقاط القوة والجوانب التي تحتاج إلى دعم، ويقدّم توصيات تعليمية عملية لوليّ الأمر."
      : "We are building a report that highlights strengths and support areas with practical parent recommendations.",
  });

  fsObj.alerts = Object.assign({}, fsObj.alerts || {}, {
    panelTitle: ar ? "التنبيهات والمتابعة" : "Alerts and follow-up",
    panelLead: ar
      ? "اختر الأحداث التي تريد أن تُطلعك عليها رقيم."
      : "Choose the events you want Raqeem to notify you about.",
    soonTitle: ar ? "تنبيهات المتابعة" : "Follow-up alerts",
    soonBody: ar
      ? "نعمل على تجهيز تنبيهات تساعدك على متابعة تقدّم أطفالك دون إزعاج."
      : "We are preparing alerts that help you follow progress without noise.",
  });

  Object.assign(fsObj.appearance, {
    panelTitle: ar ? "المظهر وسهولة الاستخدام" : "Appearance and accessibility",
    panelLead: ar ? "اضبط طريقة ظهور رقيم على هذا الجهاز." : "Adjust how Raqeem looks on this device.",
    applied: ar ? "تم تطبيق التفضيل." : "Preference applied.",
    contrastOptions: {
      default: ar ? "افتراضي" : "Default",
      high: ar ? "تباين عالٍ" : "High contrast",
    },
    sizes: {
      default: ar ? "عادي" : "Normal",
      large: ar ? "كبير" : "Large",
      xlarge: ar ? "كبير جدًا" : "Extra large",
    },
    deviceNote: ar
      ? "تُحفظ إعدادات العرض على هذا الجهاز فقط."
      : "Display settings are saved on this device only.",
  });

  Object.assign(fsObj.security, {
    panelTitle: ar ? "الأمان والدخول" : "Security and access",
    panelLead: ar
      ? "احمِ حسابك وتحكّم في الانتقال من مساحة الطفل إلى مساحة وليّ الأمر."
      : "Protect your account and control the return from child space to parent mode.",
    confirmPassword: ar ? "تأكيد كلمة المرور الجديدة" : "Confirm new password",
    passwordMin: ar ? "ثمانية أحرف على الأقل." : "At least 8 characters.",
    passwordMismatch: ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.",
    pinMissing: ar ? "لم يتم تعيين رمز بعد" : "No PIN set yet",
    pinActive: ar ? "رمز وليّ الأمر مفعّل" : "Parent PIN is active",
    createPin: ar ? "إنشاء رمز" : "Create PIN",
    confirmPin: ar ? "تأكيد الرمز" : "Confirm PIN",
    privacyHeading: ar ? "الخصوصية" : "Privacy",
  });

  Object.assign(fsObj.help, {
    panelTitle: ar ? "المساعدة والدعم" : "Help and support",
    panelLead: ar
      ? "اعثر على إجابة سريعة أو تواصل معنا عند الحاجة."
      : "Find a quick answer or contact us when you need help.",
    contactTitle: ar ? "تواصل مع الدعم" : "Contact support",
    contactBody: ar
      ? "راسلنا عبر نموذج التواصل وسنعود إليك في أقرب وقت."
      : "Write to us through the contact form and we will get back soon.",
    reportTitle: ar ? "الإبلاغ عن مشكلة" : "Report a problem",
    reportBody: ar
      ? "صف المشكلة دون إدخال كلمة المرور أو بيانات حساسة."
      : "Describe the issue without sharing passwords or sensitive data.",
    cards: {
      how: {
        title: ar ? "كيف تعمل رقيم؟" : "How does Raqeem work?",
        body: ar ? "يراجع، يكسب، ويبني." : "Review, earn, and build.",
      },
      points: {
        title: ar ? "النقاط والمتجر" : "Points and store",
        body: ar
          ? "كيف يكسب الطفل النقاط، ولماذا تظهر أدوات المقر بالترتيب."
          : "How children earn points and why HQ tools unlock in order.",
      },
      hq: {
        title: ar ? "المقر المهني" : "Career headquarters",
        body: ar
          ? "كيف يتطور مقر مهنة الطفل مع تقدّمه في الدروس."
          : "How the career HQ grows with lesson progress.",
      },
      account: {
        title: ar ? "الحساب والأبناء" : "Account and children",
        body: ar
          ? "إضافة طفل، اختيار ملف، وتعديل بياناته."
          : "Add a child, open a profile, and edit details.",
      },
      faq: {
        title: ar ? "الأسئلة الشائعة" : "FAQ",
        body: ar
          ? "إجابات مختصرة عن الاستخدام اليومي لرقيم."
          : "Short answers about everyday use of Raqeem.",
      },
    },
  });

  data.familyHelp = Object.assign({}, data.familyHelp || {}, {
    title: ar ? "مساعدة العائلة" : "Family help",
    lead: ar
      ? "إجابات مختصرة عن رقيم والنقاط والمقر والحساب."
      : "Short answers about Raqeem, points, HQ, and accounts.",
    back: ar ? "العودة للإعدادات" : "Back to settings",
    howTitle: ar ? "كيف تعمل رقيم؟" : "How does Raqeem work?",
    howBody: ar
      ? "يراجع الطفل دروسه، يكسب نقاطًا، ويبني مقر مهنته خطوة بخطوة تحت إشراف ولي الأمر."
      : "The child reviews lessons, earns points, and builds a career HQ step by step under parent guidance.",
    pointsTitle: ar ? "النقاط والمتجر" : "Points and store",
    pointsBody: ar
      ? "تُكتسب النقاط من الدروس والتحديات، وتُستخدم لشراء أدوات المقر بالترتيب."
      : "Points come from lessons and challenges and unlock HQ tools in order.",
    hqTitle: ar ? "المقر المهني" : "Career headquarters",
    hqBody: ar
      ? "المقر مساحة بصرية تعكس تقدّم الطفل في المهنة التي اختارها."
      : "HQ is a visual space that reflects progress in the chosen profession.",
    accountTitle: ar ? "الحساب والأبناء" : "Account and children",
    accountBody: ar
      ? "من إعدادات العائلة تضيف الأطفال وتعدّل ملفاتهم وتفتح مساحة كل طفل."
      : "From family settings you add children, edit profiles, and open each child space.",
    faqTitle: ar ? "الأسئلة الشائعة" : "FAQ",
    faqBody: ar
      ? "أنشئ حساب ولي أمر واحد، أضف ملفًا لكل طفل، واختر مهنة وصفًا ليبدأ التعلم."
      : "Create one parent account, add a profile per child, and choose profession and grade to begin.",
  });

  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log("patched", file);
}

patch("messages/ar.json", "ar");
patch("messages/en.json", "en");
