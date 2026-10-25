export const dashboardHtml = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101a33">
  <title>Morocco COD — لوحة الإدارة</title>
  <style>
    :root{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#20283a;background:#f3f5f9;font-synthesis:none;font-optical-sizing:auto}
    *{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button{cursor:pointer}
    body:not(.authenticated) .sidebar,body:not(.authenticated) .app{display:none}
    #login-screen{display:none;min-height:100vh;place-items:center;padding:18px;background:linear-gradient(145deg,#111a32,#263454)}
    body:not(.authenticated) #login-screen{display:grid}
    .login-card{width:min(100%,430px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 18px 50px #0003}
    .login-card h1{font-size:21px;margin:0 0 7px}.login-card p{font-size:12px;color:#818b9d;margin:0 0 22px;line-height:1.7}
    .login-card .field{margin-bottom:13px}.login-card .button{width:100%;padding:11px}
    .login-error{min-height:20px;margin-top:10px;color:#b3443e;font-size:11px}
    .login-switch{border:0;background:transparent;color:#315ca8;font-size:11px;padding:12px 0 0;text-decoration:underline}
    .sidebar{position:fixed;inset:0 0 0 auto;width:248px;background:#111a32;color:#dce3f3;padding:22px 15px;z-index:5;display:flex;flex-direction:column}
    .brand{display:flex;align-items:center;gap:11px;padding:0 7px 22px;border-bottom:1px solid #ffffff1b;color:white;font-size:18px;font-weight:750}
    .brand-icon{width:40px;height:40px;border-radius:12px;background:#f5a623;color:#16213a;display:grid;place-items:center;font-size:23px;font-weight:900}
    .brand small{display:block;color:#9da9c4;font-size:11px;font-weight:450;margin-top:4px}
    .nav-label{font-size:10px;letter-spacing:.08em;color:#7784a2;padding:21px 12px 9px}
    .nav{display:flex;flex-direction:column;gap:5px}.nav a{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:9px;color:#c4cde0;text-decoration:none;font-size:13px;transition:background .15s,color .15s}
    .nav a:hover,.nav a.active{background:#263454;color:white}.nav-icon{width:21px;text-align:center;font-size:16px;color:#aebbd8}
    .sidebar-foot{margin-top:auto;background:#1b2743;border:1px solid #ffffff13;border-radius:10px;padding:12px;font-size:11px;line-height:1.8;color:#bdc8df}
    .app{margin-right:248px;min-height:100vh}.topbar{height:70px;background:#fff;border-bottom:1px solid #e9edf3;display:flex;align-items:center;justify-content:space-between;padding:0 30px;position:sticky;top:0;z-index:3}
    .top-title{font-size:17px;font-weight:750}.top-subtitle{font-size:11px;color:#8a93a4;margin-top:3px}.top-actions{display:flex;align-items:center;gap:14px}.local-pill{border:1px solid #bde7ce;background:#edfaf1;color:#27834e;border-radius:30px;padding:7px 11px;font-size:11px;white-space:nowrap}
    .avatar{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#e9edf6;color:#283754;font-weight:700;font-size:12px}
    main{max-width:1500px;margin:0 auto;padding:25px 29px 48px}.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:20px}.page-head h1{font-size:21px;margin:0}.page-head p{margin:5px 0 0;color:#818b9d;font-size:12px}
    .notice{background:#fff8e9;border:1px solid #f2dfb3;color:#715714;border-radius:9px;padding:11px 14px;margin-bottom:18px;font-size:12px;line-height:1.7}
    .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.stat,.panel{background:white;border:1px solid #e9edf3;border-radius:12px;box-shadow:0 3px 12px #1a2b4509}
    .stat{padding:16px;min-height:110px;position:relative;overflow:hidden}.stat-label{font-size:11px;color:#818b9d}.stat-value{display:block;font-size:25px;line-height:1.2;margin-top:9px;font-weight:750;color:#20283a}.stat-foot{font-size:10px;color:#9aa2b0;margin-top:5px}.stat-icon{position:absolute;left:15px;top:16px;width:34px;height:34px;border-radius:10px;background:#f0f3fa;color:#3e537c;display:grid;place-items:center;font-size:17px}
    .stat.profit{background:#17223f;border-color:#17223f}.stat.profit .stat-label,.stat.profit .stat-foot{color:#bbc5db}.stat.profit .stat-value{color:#fff}.stat.profit .stat-icon{background:#2b395a;color:#f3c969}
    .grid-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(290px,.9fr);gap:15px;margin-bottom:16px}.panel{overflow:hidden;scroll-margin-top:84px}.panel-head{padding:15px 17px;border-bottom:1px solid #edf0f4;display:flex;align-items:center;justify-content:space-between;gap:10px}.panel-head h2{font-size:14px;margin:0}.panel-head p{margin:4px 0 0;font-size:10px;color:#8a93a4}.panel-body{padding:16px 17px}.muted{font-size:10px;color:#8a93a4}
    .status-list{display:flex;flex-direction:column;gap:14px}.status-row{display:grid;grid-template-columns:110px 1fr 34px;align-items:center;gap:10px;font-size:11px}.status-name{color:#626d80}.status-count{text-align:left;color:#4e586a;font-weight:650}.progress{height:8px;border-radius:10px;background:#edf0f5;overflow:hidden}.progress span{height:100%;display:block;border-radius:10px;min-width:0;transition:width .25s}.progress .p-yellow{background:#f2b544}.progress .p-blue{background:#5489e8}.progress .p-purple{background:#8b6bd1}.progress .p-green{background:#36ae75}.progress .p-red{background:#e66e65}
    .shipping-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ship-item{padding:13px;border-radius:9px;background:#f7f8fb}.ship-item label{display:block;font-size:10px;color:#818b9d}.ship-item strong{display:block;font-size:21px;margin-top:6px}.ship-item small{font-size:10px;color:#929bab}
    .profit-list{display:flex;flex-direction:column;gap:12px}.profit-line{display:flex;justify-content:space-between;gap:10px;font-size:11px}.profit-line span:first-child{color:#758094}.profit-line strong{font-weight:700}.profit-line.total{border-top:1px solid #edf0f4;padding-top:12px;font-size:13px}.estimate-note{font-size:10px;color:#969eac;line-height:1.7;margin-top:14px}
    .button{border:0;border-radius:8px;background:#315ca8;color:#fff;font-weight:650;padding:9px 12px;font-size:11px}.button:hover{background:#254985}.button.secondary{background:#eef2f9;color:#344968}.button:disabled{opacity:.5;cursor:not-allowed}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.field{display:flex;flex-direction:column;gap:5px}.field.full{grid-column:1/-1}.field label{font-size:10px;font-weight:650;color:#596579}.field input,.field select{border:1px solid #e0e5ed;border-radius:7px;padding:9px 10px;background:white;color:#20283a;min-width:0;font-size:11px}.form-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}
    .orders-list{display:flex;flex-direction:column;gap:8px;max-height:410px;overflow:auto}.order{border:1px solid #e9edf3;border-radius:9px;padding:11px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.order-title{font-size:12px;font-weight:700}.order-meta{font-size:10px;color:#7f899b;margin-top:5px;line-height:1.7;overflow-wrap:anywhere}.order-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.order-actions select{font-size:10px;padding:6px;border:1px solid #e0e5ed;border-radius:7px;max-width:150px;background:white}
    .badge{display:inline-flex;padding:3px 7px;border-radius:20px;background:#eef2f8;color:#43536e;font-size:9px;font-weight:700;white-space:nowrap}.badge.awaiting_confirmation{background:#fff3d9;color:#93660d}.badge.confirmed,.badge.processing{background:#eaf1ff;color:#3b65ad}.badge.shipped{background:#f0eaff;color:#7257ad}.badge.delivered{background:#e6f7ed;color:#26834e}.badge.cancelled{background:#fff0ee;color:#aa4b45}
    .chat-layout{display:grid;grid-template-columns:minmax(135px,.38fr) minmax(0,1fr);min-height:390px}.chat-list{background:#fafbfc;border-left:1px solid #edf0f4;overflow:auto;max-height:440px}.chat-item{padding:12px 10px;border-bottom:1px solid #edf0f4;cursor:pointer}.chat-item.active{background:#edf3ff;border-right:3px solid #416db8}.chat-customer{font-size:11px;font-weight:700}.chat-preview{font-size:10px;color:#818b9d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px}.chat-main{display:flex;flex-direction:column;min-width:0}.chat-top{padding:11px 13px;border-bottom:1px solid #edf0f4;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px}.messages{padding:13px;display:flex;flex-direction:column;gap:9px;flex:1;max-height:310px;min-height:210px;overflow:auto;background:#f7f8fb}.bubble{max-width:86%;padding:9px 11px;border-radius:10px;font-size:11px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.bubble.customer{align-self:flex-start;background:white;border:1px solid #e8ebf0}.bubble.assistant{align-self:flex-end;background:#e4efff;color:#263f67}.bubble.agent{align-self:flex-end;background:#e4f6eb;color:#235d3b}.bubble time{display:block;color:#8490a2;font-size:9px;margin-top:4px}.chat-compose{padding:10px;display:flex;gap:7px}.chat-compose input{flex:1;min-width:0;border:1px solid #e0e5ed;border-radius:8px;padding:9px;font-size:11px}.chat-controls{display:flex;gap:7px;padding:0 10px 11px}
    .table-wrap{overflow-x:auto}.data-table{border-collapse:collapse;width:100%;font-size:11px}.data-table th,.data-table td{text-align:right;padding:11px;border-bottom:1px solid #edf0f4;white-space:nowrap}.data-table th{font-size:10px;color:#818b9d;font-weight:650;background:#fafbfc}.product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.product-card{border:1px solid #e9edf3;border-radius:9px;padding:13px}.product-card strong{display:block;font-size:12px}.product-card p{font-size:10px;color:#818b9d;line-height:1.6;min-height:32px}.product-card span{font-size:12px;color:#315ca8;font-weight:750}
    .activity-list{display:flex;flex-direction:column;gap:0}.activity{padding:11px 3px;border-bottom:1px solid #edf0f4;display:flex;justify-content:space-between;gap:12px;font-size:11px}.activity:last-child{border-bottom:0}.activity span{color:#667186}.activity time{font-size:9px;color:#929bab;white-space:nowrap}
    .empty{padding:21px;text-align:center;color:#9099a8;font-size:11px}.menu-toggle{display:none;border:0;background:transparent;font-size:22px;color:#354360}
    #toast{position:fixed;left:20px;bottom:20px;background:#17223f;color:white;padding:11px 15px;border-radius:8px;box-shadow:0 5px 20px #18243b25;font-size:12px;opacity:0;transform:translateY(8px);transition:.18s;pointer-events:none;z-index:9}#toast.visible{opacity:1;transform:translateY(0)}.error{color:#b3443e}
    @media(max-width:1120px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-two{grid-template-columns:1fr 1fr}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:850px){.sidebar{transform:translateX(100%);transition:transform .2s;box-shadow:-10px 0 35px #111a3240}.sidebar.open{transform:translateX(0)}.app{margin-right:0}.menu-toggle{display:block}.topbar{padding:0 18px}.top-actions{gap:9px}main{padding:22px 18px 40px}.grid-two{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.topbar{height:62px;padding:0 12px}.top-title{font-size:14px}.top-subtitle{font-size:9px}.local-pill{font-size:9px;padding:6px 8px}.avatar{display:none}main{padding:17px 12px 32px}.page-head h1{font-size:18px}.stats{gap:8px}.stat{padding:12px;min-height:99px}.stat-value{font-size:21px}.stat-icon{left:10px;top:11px;width:29px;height:29px}.grid-two{grid-template-columns:1fr;gap:10px;margin-bottom:10px}.panel-head,.panel-body{padding:13px}.status-row{grid-template-columns:90px 1fr 25px;gap:7px;font-size:10px}.product-grid{grid-template-columns:1fr}.chat-layout{grid-template-columns:105px minmax(0,1fr)}.chat-list{max-height:390px}.chat-item{padding:10px 7px}.chat-customer{font-size:10px}.chat-controls{flex-wrap:wrap}.order{grid-template-columns:1fr}.order-actions{justify-content:flex-start}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}}
  </style>
</head>
<body>
  <section id="login-screen" aria-label="تسجيل الدخول">
    <form id="login-form" class="login-card">
      <div class="brand-icon" style="margin-bottom:17px">م</div>
      <h1>تسجيل الدخول</h1>
      <p>أدخل بيانات المسؤول للوصول إلى لوحة إدارة Morocco COD.</p>
      <div class="field"><label for="login-username">اسم المستخدم</label><input id="login-username" name="username" autocomplete="username" required maxlength="100"></div>
      <div class="field"><label for="login-password">كلمة المرور</label><input id="login-password" name="password" type="password" autocomplete="current-password" required maxlength="200"></div>
      <button class="button" type="submit">دخول</button>
      <div id="login-error" class="login-error" role="alert" aria-live="polite"></div>
      <button class="login-switch" id="show-register" type="button">إنشاء حساب جديد</button>
    </form>
    <form id="register-form" class="login-card" hidden>
      <div class="brand-icon" style="margin-bottom:17px">م</div>
      <h1>إنشاء حساب جديد</h1>
      <p>أدخل معلوماتك ومعلومات متجرك. جميع الحسابات لديها صلاحيات إدارية كاملة.</p>
      <fieldset id="registration-details" style="border:0;padding:0;margin:0;min-width:0">
      <div class="field" id="registration-invite-field" hidden><label for="register-invite-code">رمز الدعوة</label><input id="register-invite-code" name="inviteCode" type="password" autocomplete="off" maxlength="256"></div>
      <div class="field"><label for="register-full-name">الاسم الكامل</label><input id="register-full-name" name="fullName" autocomplete="name" required minlength="2" maxlength="100" placeholder="مثال: محمد العلوي"></div>
      <div class="field"><label for="register-email">البريد الإلكتروني</label><input id="register-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com"></div>
      <div class="field"><label for="register-phone">رقم الهاتف المغربي</label><input id="register-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30" placeholder="0612345678"></div>
      <div class="field"><label for="register-store-name">اسم المتجر</label><input id="register-store-name" name="storeName" autocomplete="organization" required minlength="2" maxlength="100" placeholder="مثال: متجر الأطلس"></div>
      <div class="field"><label for="register-username">اسم المستخدم</label><input id="register-username" name="username" autocomplete="username" required minlength="3" maxlength="100"></div>
      <div class="field"><label for="register-password">كلمة المرور</label><input id="register-password" name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="200" aria-describedby="password-help"><small id="password-help" class="muted">12 حرفًا على الأقل.</small></div>
      <div class="field"><label for="register-password-confirm">تأكيد كلمة المرور</label><input id="register-password-confirm" name="passwordConfirm" type="password" autocomplete="new-password" required minlength="12" maxlength="200"></div>
      <button class="button" type="submit">إنشاء الحساب</button>
      </fieldset>
      <div id="verification-fields" hidden>
        <p class="muted">أرسلنا رمزًا من 6 أرقام إلى هاتفك. أدخله خلال 5 دقائق لإكمال إنشاء الحساب.</p>
        <div class="field"><label for="registration-code">رمز التحقق</label><input id="registration-code" name="verificationCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="123456" aria-label="رمز تحقق من ستة أرقام"></div>
        <button class="button" id="verify-registration" type="submit">تأكيد الهاتف وإنشاء الحساب</button>
      </div>
      <div id="register-error" class="login-error" role="alert" aria-live="polite"></div>
      <button class="login-switch" id="show-login" type="button">لديك حساب؟ تسجيل الدخول</button>
    </form>
  </section>
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="brand-icon">م</span><span>Morocco COD<small>منصة إدارة الطلبات</small></span></div>
    <div class="nav-label">القائمة الرئيسية</div>
    <nav class="nav" aria-label="التنقل الرئيسي">
      <a class="active" href="#overview"><span class="nav-icon">▦</span>الإحصائيات</a>
      <a href="#orders-section"><span class="nav-icon">▤</span>الطلبات</a>
      <a href="#customers-section"><span class="nav-icon">♙</span>الزبناء</a>
      <a href="#products-section"><span class="nav-icon">▣</span>المنتجات</a>
      <a href="#expenses-section"><span class="nav-icon">◉</span>المصاريف</a>
      <a href="#activity-section"><span class="nav-icon">◷</span>السجل</a>
      <a href="#inbox-section"><span class="nav-icon">▧</span>صندوق الوارد</a>
    </nav>
    <div class="sidebar-foot">بيئة محلية تجريبية<br>لا يوجد اتصال بـ WhatsApp أو Claude الحقيقيين.</div>
  </aside>
  <div class="app">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:12px"><button class="menu-toggle" id="menu-toggle" type="button" aria-label="فتح القائمة">☰</button><div><div class="top-title">لوحة إدارة Morocco COD</div><div class="top-subtitle">إدارة الطلبات وخدمة الزبناء</div></div></div>
      <div class="top-actions"><span class="local-pill">● وضع محلي تجريبي</span><span class="avatar" aria-label="المسؤول">م</span><button class="button secondary" id="logout" type="button">تسجيل الخروج</button></div>
    </header>
    <main>
      <section id="overview">
        <div class="page-head"><div><h1>الإحصائيات</h1><p>نظرة عامة على الطلبات والتوصيل والأرباح التقديرية</p></div><span class="muted">بيانات محفوظة محلياً · MAD</span></div>
        <div class="notice"><strong>لوحة داخلية تجريبية وليست متجراً عاماً.</strong> استخدم بيانات وهمية فقط. رسائل واتساب وردود الذكاء الاصطناعي محاكاة محلية؛ لا تُرسل أي رسائل حقيقية. صافي الربح والمصاريف أرقام تقديرية توضيحية وليست محاسبة فعلية.</div>
        <section class="stats" aria-label="ملخص الإحصائيات">
          <div class="stat"><span class="stat-icon">▤</span><span class="stat-label">إجمالي الطلبات</span><strong class="stat-value" id="stat-total">0</strong><div class="stat-foot">جميع الطلبات المسجلة</div></div>
          <div class="stat"><span class="stat-icon">◷</span><span class="stat-label">بانتظار التأكيد</span><strong class="stat-value" id="stat-pending">0</strong><div class="stat-foot">تحتاج موافقة صريحة</div></div>
          <div class="stat"><span class="stat-icon">➜</span><span class="stat-label">قيد التوصيل</span><strong class="stat-value" id="stat-shipping">0</strong><div class="stat-foot">تحضير أو شحن</div></div>
          <div class="stat profit"><span class="stat-icon">◈</span><span class="stat-label">صافي الربح التقديري</span><strong class="stat-value" id="stat-profit">0 د.م.</strong><div class="stat-foot">من الطلبات المسلّمة فقط</div></div>
        </section>
        <section class="grid-two">
          <article class="panel">
            <div class="panel-head"><div><h2>حالة الطلبات</h2><p>توزيع الطلبات حسب المرحلة الحالية</p></div><span class="muted" id="status-total">0 طلب</span></div>
            <div class="panel-body"><div class="status-list" id="status-bars"></div></div>
          </article>
          <article class="panel">
            <div class="panel-head"><div><h2>ملخص التوصيل</h2><p>مؤشرات المتابعة المحلية</p></div></div>
            <div class="panel-body"><div class="shipping-grid">
              <div class="ship-item"><label>تم التسليم</label><strong id="ship-delivered">0</strong><small>طلب ناجح</small></div>
              <div class="ship-item"><label>في الطريق</label><strong id="ship-active">0</strong><small>تحضير أو شحن</small></div>
              <div class="ship-item"><label>ملغى</label><strong id="ship-cancelled">0</strong><small>طلب ملغى</small></div>
              <div class="ship-item"><label>معدل التسليم</label><strong id="ship-rate">0%</strong><small>من الطلبات المحسومة</small></div>
            </div></div>
          </article>
        </section>
        <section class="grid-two">
          <article class="panel">
            <div class="panel-head"><div><h2>تفصيل الربح</h2><p>تقدير توضيحي للطلبات المسلّمة فقط</p></div><span class="badge">تجريبي</span></div>
            <div class="panel-body"><div class="profit-list">
              <div class="profit-line"><span>إيرادات الطلبات المسلّمة</span><strong id="profit-revenue">0 د.م.</strong></div>
              <div class="profit-line"><span>تكلفة المنتجات (تقدير 50%)</span><strong id="profit-cost">− 0 د.م.</strong></div>
              <div class="profit-line"><span>التوصيل (تقدير 25 د.م. لكل طلب)</span><strong id="profit-delivery">− 0 د.م.</strong></div>
              <div class="profit-line total"><span>صافي الربح التقديري</span><strong id="profit-net">0 د.م.</strong></div>
            </div><div class="estimate-note">الافتراضات ثابتة لأغراض عرض النموذج فقط؛ لا تمثل تكلفة فعلية أو بيانات محاسبية.</div></div>
          </article>
          <article class="panel">
            <div class="panel-head"><div><h2>صندوق الوارد</h2><p>محادثات الدعم والتحويل للموظف</p></div><a class="button secondary" href="#inbox-section">فتح المحادثات</a></div>
            <div class="panel-body"><div class="shipping-grid">
              <div class="ship-item"><label>كل المحادثات</label><strong id="stat-chats">0</strong><small>محاكاة WhatsApp</small></div>
              <div class="ship-item"><label>تحتاج موظفاً</label><strong id="stat-human">0</strong><small>بعد التسليم البشري</small></div>
            </div><p class="muted" style="line-height:1.8;margin:13px 0 0">الرد الآلي يعمل عبر محاكي Claude المحلي فقط. لن يتم إرسال رسائل فعلية.</p></div>
          </article>
        </section>
      </section>
      <section class="grid-two">
        <article class="panel" id="orders-section">
          <div class="panel-head"><div><h2>إدارة الطلبات</h2><p>أنشئ طلبات COD تجريبية وتابع حالتها</p></div><button class="button secondary" id="refresh-orders" type="button">تحديث</button></div>
          <div class="panel-body">
            <form id="order-form">
              <div class="form-grid">
                <div class="field"><label for="customer">اسم الزبون (وهمي)</label><input id="customer" name="customerName" required maxlength="100" placeholder="مثال: زبون تجريبي"></div>
                <div class="field"><label for="phone">رقم هاتف مغربي تجريبي</label><input id="phone" name="phone" required placeholder="0612345678"></div>
                <div class="field"><label for="product">المنتج</label><select id="product" name="productId" required></select></div>
                <div class="field"><label for="quantity">الكمية</label><input id="quantity" name="quantity" type="number" min="1" max="10" value="1" required></div>
                <div class="field full"><label for="address">عنوان التوصيل الوهمي</label><input id="address" name="address" required minlength="5" maxlength="300" placeholder="الحي، المدينة"></div>
              </div>
              <div class="form-actions"><span class="muted" id="order-total">الإجمالي: — د.م.</span><button class="button" type="submit">إنشاء طلب COD</button></div>
            </form>
            <div class="orders-list" id="orders" style="margin-top:15px"><div class="empty">جارٍ تحميل الطلبات…</div></div>
          </div>
        </article>
        <article class="panel" id="customers-section">
          <div class="panel-head"><div><h2>الزبناء</h2><p>جهات الاتصال المستخرجة من الطلبات التجريبية</p></div><span class="badge" id="customer-count">0</span></div>
          <div class="panel-body table-wrap"><table class="data-table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>الطلبات</th><th>المجموع</th></tr></thead><tbody id="customers"><tr><td colspan="4" class="empty">لا توجد بيانات بعد</td></tr></tbody></table></div>
        </article>
      </section>
      <section class="grid-two">
        <article class="panel" id="products-section">
          <div class="panel-head"><div><h2>المنتجات</h2><p>كتالوج وهمي بالدرهم المغربي</p></div></div>
          <div class="panel-body"><div id="products" class="product-grid"></div></div>
        </article>
        <article class="panel" id="expenses-section">
          <div class="panel-head"><div><h2>المصاريف التقديرية</h2><p>مرتبطة بالطلبات التي تم تسليمها</p></div></div>
          <div class="panel-body"><div class="profit-list">
            <div class="profit-line"><span>تكلفة المنتجات المقدّرة</span><strong id="expense-products">0 د.م.</strong></div>
            <div class="profit-line"><span>تكلفة التوصيل المقدّرة</span><strong id="expense-delivery">0 د.م.</strong></div>
            <div class="profit-line total"><span>مجموع المصاريف التقديري</span><strong id="expense-total">0 د.م.</strong></div>
          </div><div class="estimate-note">ليست هذه مصاريف فعلية؛ إنها افتراضات ثابتة للعرض المحلي.</div></div>
        </article>
      </section>
      <section class="grid-two">
        <article class="panel" id="activity-section">
          <div class="panel-head"><div><h2>السجل والنشاط</h2><p>ملخص محلي للحالات والرسائل الأخيرة</p></div></div>
          <div class="panel-body"><div id="activity" class="activity-list"><div class="empty">لا يوجد نشاط بعد</div></div></div>
        </article>
        <article class="panel" id="inbox-section">
          <div class="panel-head"><div><h2>صندوق وارد الدعم</h2><p>رسائل WhatsApp الواردة وردود AI المحاكية</p></div><span class="badge">محلي فقط</span></div>
          <div class="panel-body">
            <form id="conversation-form" class="form-actions" style="margin:0 0 12px">
              <input id="new-chat-phone" required placeholder="هاتف تجريبي · 0612345678" aria-label="رقم هاتف تجريبي" style="flex:1;min-width:0;border:1px solid #e0e5ed;border-radius:8px;padding:9px;font-size:11px">
              <button class="button" type="submit">محادثة جديدة</button>
            </form>
            <div class="chat-layout">
              <div id="chat-list" class="chat-list"><div class="empty">لا توجد محادثات</div></div>
              <div class="chat-main">
                <div id="chat-top" class="chat-top"><span>اختر محادثة أو أنشئ واحدة</span></div>
                <div id="messages" class="messages"><div class="empty">ستظهر الرسائل وردود AI هنا</div></div>
                <form id="message-form" class="chat-compose"><input id="message-text" required maxlength="2000" placeholder="رسالة واردة تجريبية من WhatsApp…" aria-label="محاكاة رسالة زبون"><button class="button" type="submit">محاكاة</button></form>
                <div class="chat-controls"><button id="handoff" class="button secondary" type="button" disabled>تسليم لموظف</button><button id="reply-mode" class="button secondary" type="button" disabled>رد الموظف</button></div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  </div>
  <div id="toast" role="status" aria-live="polite"></div>
  <script>
    (function(){
      var products=[],orders=[],conversations=[],selectedId=null,toastTimer;
      var statusLabels={awaiting_confirmation:"بانتظار التأكيد",confirmed:"مؤكد",processing:"قيد التحضير",shipped:"في الطريق",delivered:"تم التسليم",cancelled:"ملغى"};
      var statusColors={awaiting_confirmation:"p-yellow",confirmed:"p-blue",processing:"p-purple",shipped:"p-blue",delivered:"p-green",cancelled:"p-red"};
      function el(id){return document.getElementById(id)}
      function esc(value){return String(value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
      function money(value){return new Intl.NumberFormat("ar-MA",{maximumFractionDigits:0}).format(value)+" د.م."}
      function notify(text,error){var node=el("toast");node.textContent=text;node.classList.add("visible");node.classList.toggle("error",!!error);clearTimeout(toastTimer);toastTimer=setTimeout(function(){node.classList.remove("visible")},3200)}
      async function api(path,options){var response=await fetch(path,Object.assign({headers:{"content-type":"application/json"}},options||{}));var data=await response.json();if(response.status===401&&path!=="/auth/session"){document.body.classList.remove("authenticated");throw new Error("انتهت الجلسة. سجل الدخول من جديد.")}if(!response.ok)throw new Error(data.error||"تعذر إكمال الطلب");return data}
      function selectedProduct(){return products.find(function(p){return p.id===el("product").value})}
      function updateTotal(){var product=selectedProduct(),quantity=Number(el("quantity").value||1);el("order-total").textContent="الإجمالي: "+money(product?product.priceMad*quantity:0)}
      function renderStats(){var delivered=orders.filter(function(o){return o.status==="delivered"}),active=orders.filter(function(o){return o.status==="processing"||o.status==="shipped"}),revenue=delivered.reduce(function(sum,o){return sum+o.totalMad},0),cost=Math.round(revenue*.5),delivery=delivered.length*25,net=revenue-cost-delivery;el("stat-total").textContent=orders.length;el("stat-pending").textContent=orders.filter(function(o){return o.status==="awaiting_confirmation"}).length;el("stat-shipping").textContent=active.length;el("stat-profit").textContent=money(net);el("stat-chats").textContent=conversations.length;el("stat-human").textContent=conversations.filter(function(c){return c.status==="human"}).length;el("ship-delivered").textContent=delivered.length;el("ship-active").textContent=active.length;el("ship-cancelled").textContent=orders.filter(function(o){return o.status==="cancelled"}).length;var closed=delivered.length+orders.filter(function(o){return o.status==="cancelled"}).length;el("ship-rate").textContent=(closed?Math.round(delivered.length/closed*100):0)+"%";el("profit-revenue").textContent=money(revenue);el("profit-cost").textContent="− "+money(cost);el("profit-delivery").textContent="− "+money(delivery);el("profit-net").textContent=money(net);el("expense-products").textContent=money(cost);el("expense-delivery").textContent=money(delivery);el("expense-total").textContent=money(cost+delivery);renderStatusBars();renderCustomers();renderActivity()}
      function renderStatusBars(){var counts={};Object.keys(statusLabels).forEach(function(key){counts[key]=orders.filter(function(o){return o.status===key}).length});var max=Math.max(1,orders.length);el("status-total").textContent=orders.length+" طلب";el("status-bars").innerHTML=Object.keys(statusLabels).map(function(key){var count=counts[key];return '<div class="status-row"><span class="status-name">'+statusLabels[key]+'</span><div class="progress"><span class="'+statusColors[key]+'" style="width:'+(count/max*100)+'%"></span></div><span class="status-count">'+count+"</span></div>"}).join("")}
      function nextStatuses(status){var map={awaiting_confirmation:["cancelled"],confirmed:["processing","cancelled"],processing:["shipped","cancelled"],shipped:["delivered"],delivered:[],cancelled:[]};return map[status]||[]}
      function renderOrders(){var root=el("orders");if(!orders.length){root.innerHTML='<div class="empty">لا توجد طلبات بعد. أضف طلباً تجريبياً أعلاه.</div>';return}root.innerHTML=orders.slice().reverse().map(function(o){var options=nextStatuses(o.status).map(function(s){return '<option value="'+s+'">'+statusLabels[s]+"</option>"}).join("");var action=options?'<select aria-label="تغيير حالة الطلب" data-status="'+o.id+'"><option value="">تغيير الحالة…</option>'+options+"</select>":"";var confirm=o.status==="awaiting_confirmation"?'<button class="button secondary" data-confirm="'+o.id+'">تأكيد</button>':"";return '<div class="order"><div><div class="order-title">'+esc(o.customerName)+' · '+esc(o.productName)+' × '+o.quantity+'</div><div class="order-meta">'+esc(o.phone)+' · '+esc(o.address)+'<br>'+money(o.totalMad)+' · '+esc(o.id.slice(0,8))+' <span class="badge '+o.status+'">'+statusLabels[o.status]+"</span></div></div><div class=\"order-actions\">"+confirm+action+"</div></div>"}).join("")}
      function renderCustomers(){var customers={};orders.forEach(function(o){if(!customers[o.phone])customers[o.phone]={name:o.customerName,phone:o.phone,count:0,total:0};customers[o.phone].count++;customers[o.phone].total+=o.totalMad});var list=Object.keys(customers).map(function(phone){return customers[phone]});el("customer-count").textContent=list.length+" زبون";el("customers").innerHTML=list.length?list.map(function(c){return "<tr><td>"+esc(c.name)+"</td><td>"+esc(c.phone)+"</td><td>"+c.count+"</td><td>"+money(c.total)+"</td></tr>"}).join(""):'<tr><td colspan="4" class="empty">لا توجد بيانات بعد</td></tr>'}
      function renderProducts(){el("products").innerHTML=products.length?products.map(function(p){var stockText=p.stock>0?"المخزون: "+p.stock+" قطعة":"نفد من المخزون";return '<div class="product-card"><strong>'+esc(p.name)+'</strong><p>'+esc(p.description)+'<br><span style="color:'+(p.stock>0?"#315ca8":"#b3443e")+';font-weight:700;display:block;margin-top:6px">'+stockText+"</span></p><span>"+money(p.priceMad)+"</span></div>"}).join(""):'<div class="empty">لا توجد منتجات</div>'}
      function renderActivity(){var entries=[];orders.slice().reverse().forEach(function(o){entries.push({text:"طلب COD لـ "+o.customerName+" — "+statusLabels[o.status],time:"الحالة الحالية"})});conversations.slice().reverse().forEach(function(c){var last=c.messages[c.messages.length-1];if(last)entries.push({text:"محادثة "+c.phone+" — "+(last.role==="customer"?"رسالة واردة":last.role==="agent"?"رد موظف":"رد AI تجريبي"),time:new Date(last.sentAt).toLocaleString("ar-MA")})});el("activity").innerHTML=entries.length?entries.slice(0,12).map(function(entry){return '<div class="activity"><span>'+esc(entry.text)+'</span><time>'+esc(entry.time)+"</time></div>"}).join(""):'<div class="empty">لا يوجد نشاط بعد</div>'}
      function renderChatList(){var root=el("chat-list");if(!conversations.length){root.innerHTML='<div class="empty">لا توجد محادثات</div>';return}root.innerHTML=conversations.slice().reverse().map(function(c){var last=c.messages[c.messages.length-1];return '<div class="chat-item '+(selectedId===c.id?"active":"")+'" data-chat="'+c.id+'"><div class="chat-customer">'+esc(c.phone)+' <span class="badge">'+(c.status==="human"?"موظف":"AI")+'</span></div><div class="chat-preview">'+esc(last?last.text:"محادثة جديدة")+"</div></div>"}).join("")}
      function renderChat(){renderChatList();var conversation=conversations.find(function(c){return c.id===selectedId});var messages=el("messages");if(!conversation){el("chat-top").innerHTML="<span>اختر محادثة أو أنشئ واحدة</span>";messages.innerHTML='<div class="empty">ستظهر الرسائل وردود AI هنا</div>';el("handoff").disabled=true;el("reply-mode").disabled=true;return}el("chat-top").innerHTML="<span>"+esc(conversation.phone)+"</span><span class=\"badge\">"+(conversation.status==="human"?"تم التسليم لموظف":"AI نشط · محاكاة Claude")+"</span>";messages.innerHTML=conversation.messages.length?conversation.messages.map(function(m){return '<div class="bubble '+m.role+'">'+esc(m.text)+'<time>'+esc(new Date(m.sentAt).toLocaleString("ar-MA"))+" · "+(m.role==="customer"?"زبون · WhatsApp محاكى":m.role==="agent"?"رد الموظف":"رد AI · Claude محاكى")+"</time></div>"}).join(""):'<div class="empty">أرسل رسالة واردة تجريبية لرؤية رد AI.</div>';messages.scrollTop=messages.scrollHeight;el("handoff").disabled=conversation.status==="human";el("reply-mode").disabled=conversation.status!=="human";el("message-text").placeholder="رسالة واردة تجريبية من WhatsApp…"}
      async function refresh(){var data=await Promise.all([api("/orders"),api("/conversations")]);orders=data[0].orders;conversations=data[1].conversations;renderStats();renderOrders();renderChat()}
      async function init(){var result=await api("/products");products=result.products;el("product").innerHTML=products.map(function(p){var disabled=p.stock<=0?" disabled aria-disabled=\"true\"":"";return '<option value="'+esc(p.id)+'"'+disabled+'>'+esc(p.name)+(p.stock<=0?" · نفد":" · "+money(p.priceMad))+(p.stock>0?" · المخزون: "+p.stock:"")+"</option>"}).join("");renderProducts();updateTotal();await refresh()}
      el("menu-toggle").addEventListener("click",function(){el("sidebar").classList.toggle("open")});el("sidebar").addEventListener("click",function(event){if(event.target.closest("a"))el("sidebar").classList.remove("open")});
      document.querySelectorAll(".nav a").forEach(function(link){link.addEventListener("click",function(){document.querySelectorAll(".nav a").forEach(function(item){item.classList.remove("active")});link.classList.add("active")})});
      el("product").addEventListener("change",updateTotal);el("quantity").addEventListener("input",updateTotal);
      el("order-form").addEventListener("submit",async function(event){event.preventDefault();var form=new FormData(event.currentTarget);try{await api("/orders",{method:"POST",body:JSON.stringify({customerName:form.get("customerName"),phone:form.get("phone"),productId:form.get("productId"),quantity:Number(form.get("quantity")),address:form.get("address")})});event.currentTarget.reset();el("quantity").value="1";updateTotal();await refresh();notify("تم إنشاء الطلب وهو بانتظار التأكيد.")}catch(error){notify(error.message,true)}});
      el("refresh-orders").addEventListener("click",function(){refresh().catch(function(error){notify(error.message,true)})});
      el("orders").addEventListener("click",async function(event){var button=event.target.closest("[data-confirm]");if(!button)return;try{await api("/orders/"+button.dataset.confirm+"/confirm",{method:"POST",body:JSON.stringify({confirmed:true})});await refresh();notify("تم تأكيد الطلب.")}catch(error){notify(error.message,true)}});
      el("orders").addEventListener("change",async function(event){var select=event.target.closest("[data-status]");if(!select||!select.value)return;try{await api("/orders/"+select.dataset.status+"/status",{method:"PATCH",body:JSON.stringify({status:select.value})});await refresh();notify("تم تحديث حالة الطلب.")}catch(error){notify(error.message,true)}});
      el("conversation-form").addEventListener("submit",async function(event){event.preventDefault();try{var data=await api("/conversations",{method:"POST",body:JSON.stringify({phone:el("new-chat-phone").value})});el("new-chat-phone").value="";selectedId=data.conversation.id;await refresh();notify("تم فتح محادثة تجريبية.")}catch(error){notify(error.message,true)}});
      el("chat-list").addEventListener("click",function(event){var item=event.target.closest("[data-chat]");if(item){selectedId=item.dataset.chat;renderChat()}});
      el("message-form").addEventListener("submit",async function(event){event.preventDefault();if(!selectedId){notify("أنشئ أو اختر محادثة أولاً.",true);return}try{var agentReply=event.currentTarget.dataset.mode==="agent";await api("/conversations/"+selectedId+(agentReply?"/replies":"/messages"),{method:"POST",body:JSON.stringify({text:el("message-text").value})});el("message-text").value="";event.currentTarget.dataset.mode="";await refresh()}catch(error){notify(error.message,true)}});
      el("handoff").addEventListener("click",async function(){if(!selectedId)return;try{await api("/conversations/"+selectedId+"/handoff",{method:"POST",body:JSON.stringify({reason:"تحويل يدوي من لوحة الإدارة المحلية"})});await refresh();notify("تم تسليم المحادثة إلى موظف.")}catch(error){notify(error.message,true)}});
      el("reply-mode").addEventListener("click",function(){el("message-text").placeholder="اكتب رد الموظف…";el("message-form").dataset.mode="agent";el("message-text").focus()});
      function enterDashboard(form){document.body.classList.add("authenticated");form.reset();init().catch(function(error){notify("تعذر تحميل اللوحة: "+error.message,true)})}
      el("login-form").addEventListener("submit",async function(event){event.preventDefault();el("login-error").textContent="";var form=new FormData(event.currentTarget);try{await api("/auth/login",{method:"POST",body:JSON.stringify({username:form.get("username"),password:form.get("password")})});enterDashboard(event.currentTarget)}catch(error){el("login-error").textContent=error.message}});
      var registrationToken=null;
      el("register-form").addEventListener("submit",async function(event){event.preventDefault();el("register-error").textContent="";var form=new FormData(event.currentTarget);try{if(!registrationToken){var password=form.get("password");if(password!==form.get("passwordConfirm")){el("register-error").textContent="كلمتا المرور غير متطابقتين.";return}var start=await api("/auth/registration/start",{method:"POST",body:JSON.stringify({fullName:form.get("fullName"),email:form.get("email"),phone:form.get("phone"),storeName:form.get("storeName"),username:form.get("username"),password:password,inviteCode:form.get("inviteCode")})});registrationToken=start.verificationToken;el("registration-details").disabled=true;el("verification-fields").hidden=false;el("register-password-confirm").setCustomValidity("");el("registration-code").required=true;el("registration-code").focus();notify("تم إرسال رمز التحقق إلى هاتفك.")}else{await api("/auth/registration/verify",{method:"POST",body:JSON.stringify({token:registrationToken,code:form.get("verificationCode")})});registrationToken=null;enterDashboard(event.currentTarget)}}catch(error){el("register-error").textContent=error.message}});
      el("show-register").addEventListener("click",function(){el("login-form").hidden=true;el("register-form").hidden=false;el("register-username").focus()});
      el("show-login").addEventListener("click",function(){registrationToken=null;el("registration-details").disabled=false;el("verification-fields").hidden=true;el("registration-code").required=false;el("register-form").reset();el("register-form").hidden=true;el("login-form").hidden=false;el("login-username").focus()});
      el("logout").addEventListener("click",async function(){try{await api("/auth/logout",{method:"POST"});document.body.classList.remove("authenticated");el("login-password").value="";el("login-username").focus()}catch(error){notify(error.message,true)}});
      api("/auth/setup").then(function(result){el("login-form").hidden=result.setupRequired;el("register-form").hidden=!result.setupRequired;el("registration-invite-field").hidden=!result.registrationRequiresInvite;el("register-invite-code").required=result.registrationRequiresInvite;(result.setupRequired?el("register-username"):el("login-username")).focus()}).catch(function(error){el("login-error").textContent="تعذر الاتصال بالخادم: "+error.message});
    })();
  </script>
</body>
</html>`;
