/**
 * Seed script: Push political glossary terms to database
 * Run: node scripts/seed-political-glossary.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Category = require('../models/GlossaryCategory');
const GlossaryTerm = require('../models/GlossaryTerm');

const DATA = [
  {
    "category": "Términos políticos generales",
    "terms": [
      {"es": "Abstención", "en": "Abstention", "ar": "الامتناع (عن التصويت)"},
      {"es": "Activismo", "en": "Activism", "ar": "النشاط السياسي"},
      {"es": "Aforamiento", "en": "Parliamentary Immunity / Legal Privilege", "ar": "حصانة برلمانية / امتياز قانوني"},
      {"es": "Alianza", "en": "Alliance", "ar": "تحالف"},
      {"es": "Amnistía", "en": "Amnesty", "ar": "عفو (عام/سياسي)"},
      {"es": "Apaciguamiento (política de)", "en": "Appeasement", "ar": "سياسة الاسترضاء"},
      {"es": "Asedio", "en": "Siege", "ar": "حصار"},
      {"es": "Asilo político", "en": "Political Asylum", "ar": "لجوء سياسي"},
      {"es": "Austeridad", "en": "Austerity", "ar": "سياسة التقشف"},
      {"es": "Autonomía", "en": "Autonomy", "ar": "حكم ذاتي"},
      {"es": "Bipartidismo", "en": "Two-Party System", "ar": "نظام الحزبين"},
      {"es": "Bloque geopolítico", "en": "Geopolitical Bloc", "ar": "كتلة جيوسياسية"},
      {"es": "Bloqueo", "en": "Blockade", "ar": "حصار (اقتصادي/عسكري)"},
      {"es": "Borrador", "en": "Draft", "ar": "مسودة"},
      {"es": "Burocracia", "en": "Bureaucracy", "ar": "بيروقراطية"},
      {"es": "Campaña electoral", "en": "Electoral Campaign", "ar": "حملة انتخابية"},
      {"es": "Candidato", "en": "Candidate", "ar": "مرشح"},
      {"es": "Capitalismo", "en": "Capitalism", "ar": "رأسمالية"},
      {"es": "Carrera armamentista", "en": "Arms Race", "ar": "سباق التسلح"},
      {"es": "Censura", "en": "Censorship", "ar": "رقابة"},
      {"es": "Centralismo", "en": "Centralism", "ar": "مركزية سلطوية"},
      {"es": "Ciudadanía", "en": "Citizenship", "ar": "مواطنة"},
      {"es": "Clientelismo", "en": "Clientelism", "ar": "زبونية / محسوبية سياسية"},
      {"es": "Coalición", "en": "Coalition", "ar": "ائتلاف"},
      {"es": "Colonialismo", "en": "Colonialism", "ar": "استعمار"},
      {"es": "Comparecer", "en": "To Testify / To Appear before Parliament", "ar": "المثول أو الإدلاء بشهادة أمام البرلمان"},
      {"es": "Comunismo", "en": "Communism", "ar": "شيوعية"},
      {"es": "Consenso", "en": "Consensus", "ar": "توافق / إجماع"},
      {"es": "Constitución", "en": "Constitution", "ar": "دستور"},
      {"es": "Corrupción", "en": "Corruption", "ar": "فساد"},
      {"es": "Crisis política", "en": "Political Crisis", "ar": "أزمة سياسية"},
      {"es": "Cumbre", "en": "Summit", "ar": "قمة سياسية"},
      {"es": "Debate", "en": "Debate", "ar": "مناظرة / جدل"},
      {"es": "Decreto", "en": "Decree", "ar": "مرسوم"},
      {"es": "Democracia", "en": "Democracy", "ar": "ديمقراطية"},
      {"es": "Derechos humanos", "en": "Human Rights", "ar": "حقوق الإنسان"},
      {"es": "Dictadura", "en": "Dictatorship", "ar": "دكتاتورية"},
      {"es": "Diplomacia", "en": "Diplomacy", "ar": "دبلوماسية"},
      {"es": "Discurso político", "en": "Political Discourse", "ar": "خطاب سياسي"},
      {"es": "Elecciones", "en": "Elections", "ar": "انتخابات"},
      {"es": "Embajador", "en": "Ambassador", "ar": "سفير"},
      {"es": "Embargo", "en": "Embargo", "ar": "حظر اقتصادي"},
      {"es": "Estado", "en": "State", "ar": "دولة"},
      {"es": "Estado de bienestar", "en": "Welfare State", "ar": "دولة الرفاه"},
      {"es": "Estado de emergencia", "en": "State of Emergency", "ar": "حالة طوارئ"},
      {"es": "Estado fallido", "en": "Failed State", "ar": "دولة فاشلة"},
      {"es": "Extrema derecha", "en": "Far Right", "ar": "اليمين المتطرف"},
      {"es": "Federalismo", "en": "Federalism", "ar": "فيدرالية"},
      {"es": "Globalización", "en": "Globalization", "ar": "عولمة"},
      {"es": "Gobernabilidad", "en": "Governability", "ar": "قابلية الحكم"},
      {"es": "Gobierno", "en": "Government", "ar": "حكومة"},
      {"es": "Golpe de Estado", "en": "Coup d'état", "ar": "انقلاب عسكري"},
      {"es": "Guerra", "en": "War", "ar": "حرب"},
      {"es": "Hegemonía", "en": "Hegemony", "ar": "هيمنة"},
      {"es": "Huelga", "en": "Strike", "ar": "إضراب"},
      {"es": "Ideología", "en": "Ideology", "ar": "أيديولوجيا"},
      {"es": "Igualdad", "en": "Equality", "ar": "مساواة"},
      {"es": "Independencia", "en": "Independence", "ar": "استقلال"},
      {"es": "Injerencia", "en": "Interference", "ar": "تدخل في الشؤون الداخلية"},
      {"es": "Invasión", "en": "Invasion", "ar": "غزو"},
      {"es": "Investidura", "en": "Parliamentary Investiture / Vote to Form a Government", "ar": "تصويت برلماني لتشكيل الحكومة"},
      {"es": "Izquierda", "en": "The Left", "ar": "اليسار السياسي"},
      {"es": "Justicia social", "en": "Social Justice", "ar": "العدالة الاجتماعية"},
      {"es": "Lawfare", "en": "Lawfare", "ar": "تسييس القضاء"},
      {"es": "Legitimidad", "en": "Legitimacy", "ar": "شرعية"},
      {"es": "Ley", "en": "Law", "ar": "قانون"},
      {"es": "Liberalismo", "en": "Liberalism", "ar": "ليبرالية"},
      {"es": "Lobby", "en": "Lobby", "ar": "جماعة ضغط"},
      {"es": "Manifestación", "en": "Demonstration", "ar": "تظاهرة / مسيرة"},
      {"es": "Mediación", "en": "Mediation", "ar": "وساطة"},
      {"es": "Multilateralismo", "en": "Multilateralism", "ar": "تعددية الأطراف"},
      {"es": "Nacionalismo", "en": "Nationalism", "ar": "قومية"},
      {"es": "Negociaciones", "en": "Negotiations", "ar": "مفاوضات"},
      {"es": "Ocupación", "en": "Occupation", "ar": "احتلال"},
      {"es": "Oposición", "en": "Opposition", "ar": "معارضة"},
      {"es": "Parlamento", "en": "Parliament", "ar": "برلمان"},
      {"es": "Paz", "en": "Peace", "ar": "سلام"},
      {"es": "Pluralismo", "en": "Pluralism", "ar": "تعددية"},
      {"es": "Polarización", "en": "Polarization", "ar": "استقطاب"},
      {"es": "Populismo", "en": "Populism", "ar": "شعبوية"},
      {"es": "Posverdad", "en": "Post-Truth", "ar": "ما بعد الحقيقة"},
      {"es": "Prender el pulso", "en": "To Gauge Public Sentiment", "ar": "استشعار الرأي العام (تعبير صحفي)"},
      {"es": "Presidente", "en": "President", "ar": "رئيس"},
      {"es": "Presupuesto", "en": "Budget", "ar": "ميزانية"},
      {"es": "Propaganda", "en": "Propaganda", "ar": "دعاية سياسية"},
      {"es": "Referéndum", "en": "Referendum", "ar": "استفتاء"},
      {"es": "Reforma", "en": "Reform", "ar": "إصلاح"},
      {"es": "Relaciones internacionales", "en": "International Relations", "ar": "العلاقات الدولية"},
      {"es": "Resistencia", "en": "Resistance", "ar": "مقاومة"},
      {"es": "Revolución", "en": "Revolution", "ar": "ثورة"},
      {"es": "Sanciones", "en": "Sanctions", "ar": "عقوبات"},
      {"es": "Seguridad nacional", "en": "National Security", "ar": "الأمن القومي"},
      {"es": "Soberanía", "en": "Sovereignty", "ar": "سيادة"},
      {"es": "Socialismo", "en": "Socialism", "ar": "اشتراكية"},
      {"es": "Transición política", "en": "Political Transition", "ar": "مرحلة انتقالية"},
      {"es": "Tratado", "en": "Treaty", "ar": "معاهدة"},
      {"es": "Tregua", "en": "Truce", "ar": "هدنة"},
      {"es": "Veto", "en": "Veto", "ar": "فيتو"},
      {"es": "Vulnerar", "en": "To Violate / To Breach", "ar": "انتهاك / خرق"}
    ]
  },
  {
    "category": "Conflicto Israelí - palestino",
    "terms": [
      {"es":"Acciones criminales","en":"Criminal actions","ar":"أعمال إجرامية"},{"es":"Acciones represivas","en":"Repressive actions","ar":"إجراءات قمعية"},{"es":"Acuerdo","en":"Agreement / Accord","ar":"اتفاق"},{"es":"Acuerdo de alto el fuego","en":"Ceasefire agreement","ar":"اتفاق وقف إطلاق النار"},{"es":"Acuerdo de paz","en":"Peace agreement","ar":"اتفاق سلام"},{"es":"Acusaciones mutuas","en":"Mutual accusations","ar":"اتهامات متبادلة"},{"es":"Agresión","en":"Aggression","ar":"عدوان"},{"es":"Agresión armada","en":"Armed aggression","ar":"عدوان مسلح"},{"es":"Agresión brutal","en":"Brutal aggression","ar":"عدوان وحشي"},{"es":"Agresión Tripartita","en":"Tripartite Aggression","ar":"العدوان الثلاثي"},{"es":"Alto el fuego","en":"Ceasefire","ar":"وقف إطلاق النار"},{"es":"Amenaza","en":"Threat","ar":"تهديد"},{"es":"Amenaza a la seguridad internacional","en":"Threat to international security","ar":"تهديد الأمن الدولي"},{"es":"Amenaza militar","en":"Military threat","ar":"تهديد عسكري"},{"es":"Aniquilar","en":"Annihilate / Extermination","ar":"إبادة"},{"es":"Apoyo internacional","en":"International support","ar":"دعم دولي"},{"es":"Árabe","en":"Arab","ar":"عربي"},{"es":"Arresto","en":"Arrest / Detention","ar":"اعتقال"},{"es":"Asedio","en":"Siege","ar":"حصار"},{"es":"Asentamiento","en":"Settlement","ar":"مستوطنة"},{"es":"Asilo","en":"Asylum","ar":"لجوء"},{"es":"Ataque","en":"Attack","ar":"هجوم"},{"es":"Ataque aéreo","en":"Air strike","ar":"ضربة جوية"},{"es":"Ataques indiscriminados","en":"Indiscriminate attacks","ar":"هجمات عشوائية"},{"es":"Ataques injustificables","en":"Unjustifiable attacks","ar":"هجمات غير مبررة"},{"es":"Atacar","en":"Attack","ar":"يهاجم"},{"es":"Ayuda humanitaria","en":"Humanitarian aid","ar":"مساعدة إنسانية"},{"es":"Ayudas humanitarias urgentes","en":"Urgent humanitarian aid","ar":"مساعدات إنسانية طارئة"},{"es":"Barcos Flotilla Global Sumud","en":"Global Sumud Flotilla ships","ar":"سفن أسطول الصمود البحري"},{"es":"Biased / Prejudiced","en":"Biased / Prejudiced","ar":"متحيز"},{"es":"Boicot internacional","en":"International boycott","ar":"مقاطعة دولية"},{"es":"Bombardear","en":"Bomb","ar":"يقصف"},{"es":"Bombardeo","en":"Bombardment","ar":"قصف"},{"es":"Bombardeo aéreo","en":"Aerial bombardment","ar":"قصف جوي"},{"es":"Causa / Cuestión","en":"Issue / Cause","ar":"قضية"},{"es":"Ciudades densamente pobladas","en":"Densely populated cities","ar":"مدن مكتظة بالسكان"},{"es":"Cisjordania","en":"West Bank","ar":"الضفة الغربية"},{"es":"Civiles indefensos","en":"Defenceless civilians","ar":"مدنيون عزل"},{"es":"Cohetes","en":"Rockets / Missiles","ar":"صواريخ"},{"es":"Condena","en":"Condemnation","ar":"إدانة"},{"es":"Condenar","en":"Condemn / Denounce","ar":"يدين / يستنكر"},{"es":"Condenar ataques","en":"Condemn attacks","ar":"يدين الهجمات"},{"es":"Conflicto","en":"Conflict","ar":"صراع"},{"es":"Conflicto sectario","en":"Sectarian conflict","ar":"صراع طائفي"},{"es":"Comunidad internacional","en":"International Community","ar":"المجتمع الدولي"},{"es":"Comunidad / Sociedad","en":"Community / Society","ar":"مجتمع"},{"es":"Corredores seguros","en":"Safe corridors","ar":"ممرات آمنة"},{"es":"Crímenes de guerra","en":"War crimes","ar":"جرائم حرب"},{"es":"Crímenes de lesa humanidad","en":"Crimes against humanity","ar":"جرائم ضد الإنسانية"},{"es":"Crisis humanitaria","en":"Humanitarian crisis","ar":"أزمة إنسانية"},{"es":"Decisión","en":"Decision","ar":"قرار"},{"es":"Decisión Ministerial","en":"Ministerial Decision","ar":"قرار وزاري"},{"es":"Declaración Balfour","en":"Balfour Declaration","ar":"وعد بلفور"},{"es":"Decreto","en":"Decree","ar":"مرسوم"},{"es":"Decreto Real","en":"Royal Decree","ar":"مرسوم ملكي"},{"es":"Derecho de autodeterminación","en":"Right to self-determination","ar":"حق تقرير المصير"},{"es":"Derecho al retorno","en":"Right of return","ar":"حق العودة"},{"es":"Derrota de 1967","en":"Setback (1967)","ar":"نكسة 1967"},{"es":"Desestabilización","en":"Destabilization","ar":"زعزعة الاستقرار"},{"es":"Desplazamiento","en":"Displacement","ar":"تهجير"},{"es":"Desplazamiento forzoso","en":"Forced displacement","ar":"تهجير قسري"},{"es":"Detener","en":"Detain / Arrest","ar":"يعتقل"},{"es":"Disputa","en":"Dispute","ar":"نزاع"},{"es":"Emigración","en":"Emigration","ar":"هجرة خارجية"},{"es":"Embargo de armas","en":"Arms embargo","ar":"حظر الأسلحة"},{"es":"Escalada militar","en":"Military escalation","ar":"تصعيد عسكري"},{"es":"Estado judío","en":"Jewish State","ar":"دولة يهودية"},{"es":"Estado palestino","en":"Palestinian state","ar":"دولة فلسطين"},{"es":"Estado soberano","en":"Sovereign state","ar":"دولة ذات سيادة"},{"es":"Estabilidad regional","en":"Regional stability","ar":"استقرار إقليمي"},{"es":"Estrechar lazos","en":"Strengthen ties","ar":"توطيد العلاقات"},{"es":"Explosión","en":"Bombing","ar":"تفجير"},{"es":"Facciones","en":"Factions","ar":"فصائل"},{"es":"Firme","en":"Steadfast","ar":"ثابت"},{"es":"Franja de Gaza","en":"Gaza Strip","ar":"قطاع غزة"},{"es":"Futuro de paz","en":"Peaceful future","ar":"مستقبل سلمي"},{"es":"Genocidio","en":"Genocide","ar":"إبادة جماعية"},{"es":"Gran problema","en":"Major issue","ar":"قضية كبيرة"},{"es":"Granadas","en":"Grenades / Shells","ar":"قذائف"},{"es":"Grupo","en":"Group","ar":"جماعة"},{"es":"Guerra","en":"War","ar":"حرب"},{"es":"Guerra de Desgaste","en":"War of Attrition","ar":"حرب الاستنزاف"},{"es":"Herido","en":"Injured","ar":"جريح"},{"es":"Heridos","en":"Injured / Wounded","ar":"جرحى"},{"es":"Ideología sionista","en":"Zionist ideology","ar":"الفكر الصهيوني"},{"es":"Imparcial","en":"Unbiased","ar":"غير منحاز"},{"es":"Imperio Otomano","en":"Ottoman Empire","ar":"الدولة العثمانية"},{"es":"Inmigración","en":"Immigration","ar":"هجرة"},{"es":"Inquebrantable","en":"Firm / Unshakable","ar":"راسخ"},{"es":"Indefenso","en":"Defenceless","ar":"أعزل"},{"es":"Intensificar","en":"Intensify","ar":"يكثّف"},{"es":"Interesado","en":"Interested","ar":"مهتم"},{"es":"Intervención militar","en":"Military intervention","ar":"تدخل عسكري"},{"es":"Invasión","en":"Invasion","ar":"غزو"},{"es":"Invadir","en":"Invade","ar":"يغزو"},{"es":"Invasión militar","en":"Military invasion","ar":"غزو عسكري"},{"es":"Judío","en":"Jew / Jewish","ar":"يهودي"},{"es":"Judaísmo","en":"Judaism","ar":"الديانة اليهودية"},{"es":"Limpieza étnica","en":"Ethnic cleansing","ar":"تطهير عرقي"},{"es":"Lugares sagrados","en":"Sacred / Holy sites","ar":"أماكن مقدسة"},{"es":"Mandato","en":"Mandate","ar":"الانتداب"},{"es":"Mártir","en":"Martyr","ar":"شهيد"},{"es":"Martirio","en":"Martyrdom","ar":"الاستشهاد"},{"es":"Masacre","en":"Massacre","ar":"مجزرة"},{"es":"Matar","en":"Kill","ar":"يقتل"},{"es":"Matar de hambre a niños","en":"Starve children to death","ar":"تجويع الأطفال حتى الموت"},{"es":"Medidas","en":"Measures","ar":"إجراءات"},{"es":"Mezquita de Al-Aqsa","en":"Al-Aqsa Mosque","ar":"المسجد الأقصى"},{"es":"Misiles","en":"Missiles","ar":"صواريخ"},{"es":"Muertos","en":"Dead / Casualties","ar":"قتلى"},{"es":"Nakba (1948)","en":"Nakba (1948)","ar":"نكبة 1948"},{"es":"Negar","en":"Deny","ar":"ينفي"},{"es":"Negociaciones de paz","en":"Peace negotiations","ar":"مفاوضات سلام"},{"es":"Neutral","en":"Neutral","ar":"محايد"},{"es":"No interesado","en":"Uninterested","ar":"غير مهتم"},{"es":"Objetivo fundamental","en":"Fundamental objective","ar":"هدف أساسي"},{"es":"Objetivo","en":"Objective","ar":"موضوعي"},{"es":"Ocupación","en":"Occupation","ar":"احتلال"},{"es":"Ocupación militar","en":"Military occupation","ar":"احتلال عسكري"},{"es":"Operaciones militares","en":"Military operations","ar":"عمليات عسكرية"},{"es":"Organismos internacionales","en":"International organizations","ar":"منظمات دولية"},{"es":"Palestina","en":"Palestine","ar":"فلسطين"},{"es":"Palestino","en":"Palestinian","ar":"فلسطيني"},{"es":"Parcial / Prejuiciado","en":"Biased / Prejudiced","ar":"متحيز"},{"es":"Partido","en":"Party","ar":"حزب"},{"es":"Paso de Rafah","en":"Rafah Crossing","ar":"معبر رفح"},{"es":"Pérdidas humanas","en":"Human losses","ar":"خسائر بشرية"},{"es":"Problema","en":"Problem","ar":"مشكلة"},{"es":"Prohibición","en":"Prohibition / Ban","ar":"حظر / منع"},{"es":"Pueblo palestino","en":"Palestinian people","ar":"الشعب الفلسطيني"},{"es":"Reconocer","en":"Recognize / Acknowledge","ar":"يعترف / يقر"},{"es":"Reconocimiento","en":"Recognition","ar":"اعتراف"},{"es":"Refuerzo","en":"Reinforcement","ar":"تعزيز"},{"es":"Refugiado","en":"Refugee","ar":"لاجئ"},{"es":"Resiliencia","en":"Resilience","ar":"صمود"},{"es":"Resistencia","en":"Resistance","ar":"مقاومة"},{"es":"Romper el bloqueo","en":"Break the blockade","ar":"كسر الحصار"},{"es":"Santidad","en":"Sanctity","ar":"قدسية"},{"es":"Santidad de la Mezquita de Al-Aqsa","en":"Sanctity of Al-Aqsa Mosque","ar":"قدسية المسجد الأقصى"},{"es":"Sectarismo","en":"Sectarianism","ar":"طائفية"},{"es":"Seguridad","en":"Security","ar":"أمن"},{"es":"Sionismo","en":"Zionism","ar":"الصهيونية"},{"es":"Sionista","en":"Zionist","ar":"صهيوني"},{"es":"Soberanía","en":"Sovereignty","ar":"سيادة"},{"es":"Sociedad","en":"Society","ar":"مجتمع كبير"},{"es":"Solicitar asilo","en":"Seek asylum","ar":"يطلب اللجوء"},{"es":"Solución de dos Estados","en":"Two-State Solution","ar":"حل الدولتين"},{"es":"Sufrimiento","en":"Suffering","ar":"معاناة"},{"es":"Sufrir","en":"Suffer","ar":"يعاني"},{"es":"Tensiones regionales","en":"Regional tensions","ar":"توترات إقليمية"},{"es":"Territorios ocupados","en":"Occupied territories","ar":"أراضي محتلة"},{"es":"Tratado","en":"Treaty","ar":"معاهدة"},{"es":"Tregua / Armisticio","en":"Truce / Armistice","ar":"هدنة"},{"es":"Uso del derecho de veto","en":"Use the veto power","ar":"استخدام حق الفيتو"},{"es":"Víctimas","en":"Casualties","ar":"ضحايا"},{"es":"Violaciones de derechos humanos","en":"Human rights violations","ar":"انتهاكات حقوق الإنسان"}
    ]
  },
  {
    "category": "Conflicto en Sudán",
    "terms": [
      {"es":"Acaparamiento de ayuda","en":"Aid hoarding","ar":"احتكار المساعدات"},{"es":"Administración militar","en":"Military administration","ar":"إدارة عسكرية"},{"es":"Alianzas tribales","en":"Tribal alliances","ar":"تحالفات قبلية"},{"es":"Autoridad de facto","en":"De facto authority","ar":"سلطة أمر واقع"},{"es":"Bloqueo de carreteras internas","en":"Internal road blockades","ar":"قطع الطرق الداخلية"},{"es":"Caos de seguridad","en":"Security chaos","ar":"فوضى أمنية"},{"es":"Capital Jartum","en":"Khartoum (capital)","ar":"العاصمة الخرطوم"},{"es":"Colapso del sistema bancario","en":"Banking system collapse","ar":"انهيار النظام المصرفي"},{"es":"Colapso institucional","en":"Institutional collapse","ar":"انهيار مؤسسات الدولة"},{"es":"Colapso sanitario","en":"Healthcare collapse","ar":"انهيار القطاع الصحي"},{"es":"Combates urbanos","en":"Urban warfare","ar":"قتال داخل المدن"},{"es":"Consejo Soberano","en":"Sovereign Council","ar":"مجلس السيادة"},{"es":"Conflicto intraestatal","en":"Intra-state conflict","ar":"صراع داخلي"},{"es":"Control territorial","en":"Territorial control","ar":"سيطرة ميدانية"},{"es":"Crisis alimentaria","en":"Food crisis","ar":"أزمة غذاء"},{"es":"Desintegración del Estado","en":"State disintegration","ar":"تفكك الدولة"},{"es":"Desobediencia civil","en":"Civil disobedience","ar":"عصيان مدني"},{"es":"Desplazados internos","en":"Internally displaced persons","ar":"نازحون داخليًا"},{"es":"Destrucción de infraestructuras","en":"Infrastructure destruction","ar":"تدمير البنية التحتية"},{"es":"Economías de guerra","en":"War economies","ar":"اقتصاديات الحرب"},{"es":"Enfrentamientos armados","en":"Armed clashes","ar":"اشتباكات مسلحة"},{"es":"Escasez de combustible","en":"Fuel shortage","ar":"نقص الوقود"},{"es":"Estado fallido","en":"Failed state","ar":"دولة فاشلة"},{"es":"Fragmentación política","en":"Political fragmentation","ar":"انقسام سياسي"},{"es":"Fronteras porosas","en":"Porous borders","ar":"حدود مفتوحة"},{"es":"Fuerzas Armadas Sudanesas","en":"Sudanese Armed Forces","ar":"القوات المسلحة السودانية"},{"es":"Fuerzas de Apoyo Rápido","en":"Rapid Support Forces","ar":"قوات الدعم السريع"},{"es":"Golpe de Estado militar","en":"Military coup","ar":"انقلاب عسكري"},{"es":"Gobierno de transición","en":"Transitional government","ar":"حكومة انتقالية"},{"es":"Hambruna inminente","en":"Imminent famine","ar":"مجاعة وشيكة"},{"es":"Huida masiva","en":"Mass flight","ar":"نزوح جماعي"},{"es":"Inseguridad alimentaria","en":"Food insecurity","ar":"انعدام الأمن الغذائي"},{"es":"Interrupción de servicios básicos","en":"Disruption of basic services","ar":"تعطّل الخدمات الأساسية"},{"es":"Jefes tribales armados","en":"Armed tribal leaders","ar":"زعماء قبائل مسلحون"},{"es":"Limpieza tribal","en":"Tribal cleansing","ar":"تطهير قبلي"},{"es":"Mediación africana","en":"African mediation","ar":"وساطة أفريقية"},{"es":"Milicias locales","en":"Local militias","ar":"ميليشيات محلية"},{"es":"Negociaciones fallidas","en":"Failed negotiations","ar":"مفاوضات فاشلة"},{"es":"Niños soldados","en":"Child soldiers","ar":"أطفال مجندون"},{"es":"Ocupación de edificios públicos","en":"Occupation of public buildings","ar":"السيطرة على المباني الحكومية"},{"es":"Pérdida de control estatal","en":"Loss of state control","ar":"فقدان سيطرة الدولة"},{"es":"Población civil atrapada","en":"Trapped civilian population","ar":"مدنيون عالقون"},{"es":"Reclutamiento forzoso","en":"Forced recruitment","ar":"تجنيد قسري"},{"es":"Región de Darfur","en":"Darfur region","ar":"إقليم دارفور"},{"es":"Ruptura del orden público","en":"Breakdown of public order","ar":"انهيار النظام العام"},{"es":"Saqueos masivos","en":"Mass looting","ar":"نهب واسع"},{"es":"Sistema sanitario colapsado","en":"Collapsed healthcare system","ar":"انهيار النظام الصحي"},{"es":"Sociedad militarizada","en":"Militarized society","ar":"مجتمع مُعسكر"},{"es":"Tráfico de armas","en":"Arms trafficking","ar":"تهريب سلاح"},{"es":"Violencia interétnica","en":"Interethnic violence","ar":"عنف عرقي"},{"es":"Violaciones sistemáticas","en":"Systematic violations","ar":"انتهاكات ممنهجة"}
    ]
  },
  {
    "category": "Guerra ruso-ucraniana",
    "terms": [
      {"es":"Aislamiento económico de Rusia","en":"Economic isolation of Russia","ar":"عزل روسيا اقتصاديًا"},{"es":"Alto el fuego","en":"Ceasefire","ar":"وقف إطلاق النار"},{"es":"Anexión de Crimea","en":"Annexation of Crimea","ar":"ضم القرم"},{"es":"Apoyo militar occidental","en":"Western military support","ar":"دعم عسكري غربي"},{"es":"Asedio de Mariúpol","en":"Siege of Mariupol","ar":"حصار ماريوبول"},{"es":"Ataques a centrales eléctricas","en":"Targeting power plants","ar":"استهداف محطات الطاقة"},{"es":"Ataques a infraestructuras críticas","en":"Attacks on critical infrastructure","ar":"هجمات على البنية التحتية الحيوية"},{"es":"Ataques de artillería","en":"Artillery strikes","ar":"هجمات مدفعية"},{"es":"Ayuda humanitaria","en":"Humanitarian aid","ar":"مساعدات إنسانية"},{"es":"Batalla de Bajmut","en":"Battle of Bakhmut","ar":"معركة باخموت"},{"es":"Cese de hostilidades","en":"Cessation of hostilities","ar":"وقف الأعمال العدائية"},{"es":"Cohetes HIMARS","en":"HIMARS rockets","ar":"صواريخ هيمارس"},{"es":"Congelación de activos rusos","en":"Freezing Russian assets","ar":"تجميد الأصول الروسية"},{"es":"Contraofensiva ucraniana","en":"Ukrainian counteroffensive","ar":"الهجوم الأوكراني المضاد"},{"es":"Corredores humanitarios","en":"Humanitarian corridors","ar":"ممرات إنسانية"},{"es":"Crimen de guerra","en":"War crime","ar":"جريمة حرب"},{"es":"Crímenes contra la humanidad","en":"Crimes against humanity","ar":"جرائم ضد الإنسانية"},{"es":"Crisis energética europea","en":"European energy crisis","ar":"أزمة الطاقة الأوروبية"},{"es":"Desinformación","en":"Disinformation","ar":"معلومات مضللة"},{"es":"Desmilitarización","en":"Demilitarization","ar":"نزع السلاح"},{"es":"Desnazificación (retórica rusa)","en":"Denazification (Russian rhetoric)","ar":"اجتثاث النازية (خطاب روسي)"},{"es":"Desplazados internos","en":"Internally displaced persons","ar":"نازحون داخليًا"},{"es":"Deportación forzada de niños","en":"Forced deportation of children","ar":"ترحيل قسري للأطفال"},{"es":"Donbás","en":"Donbas region","ar":"إقليم دونباس"},{"es":"Drones Shahed","en":"Shahed drones","ar":"طائرات مسيّرة شاهد"},{"es":"Guerra de desgaste","en":"War of attrition","ar":"حرب استنزاف"},{"es":"Guerra informativa","en":"Information warfare","ar":"حرب معلومات"},{"es":"Guerra prolongada","en":"Prolonged war","ar":"حرب مطولة"},{"es":"Imposición de sanciones internacionales","en":"Imposition of international sanctions","ar":"فرض العقوبات الدولية"},{"es":"Invasión rusa de Ucrania","en":"Russian invasion of Ukraine","ar":"الغزو الروسي لأوكرانيا"},{"es":"Justicia internacional","en":"International justice","ar":"العدالة الدولية"},{"es":"Liberación de territorios","en":"Liberation of territories","ar":"تحرير الأراضي"},{"es":"Masacres documentadas","en":"Documented massacres","ar":"مجازر موثقة"},{"es":"Misiles balísticos","en":"Ballistic missiles","ar":"صواريخ باليستية"},{"es":"Misiles de crucero","en":"Cruise missiles","ar":"صواريخ كروز"},{"es":"Movilización parcial","en":"Partial mobilization","ar":"تعبئة جزئية"},{"es":"Negociaciones de paz","en":"Peace negotiations","ar":"مفاوضات سلام"},{"es":"Operación militar especial","en":"Special military operation","ar":"عملية عسكرية خاصة"},{"es":"Orden de arresto contra Putin","en":"Arrest warrant for Putin","ar":"مذكرة توقيف بحق بوتين"},{"es":"Paquete de sanciones","en":"Sanctions package","ar":"حزمة عقوبات"},{"es":"Presión diplomática","en":"Diplomatic pressure","ar":"ضغط دبلوماسي"},{"es":"Reconstrucción postguerra","en":"Post-war reconstruction","ar":"إعادة الإعمار بعد الحرب"},{"es":"Regiones separatistas","en":"Separatist regions","ar":"مناطق انفصالية"},{"es":"Responsabilidad de mando","en":"Command responsibility","ar":"مسؤولية القيادة"},{"es":"Sanciones económicas","en":"Economic sanctions","ar":"عقوبات اقتصادية"},{"es":"Seguridad energética","en":"Energy security","ar":"أمن الطاقة"},{"es":"Sistema de defensa Patriot","en":"Patriot air defense system","ar":"نظام باتريوت الدفاعي"},{"es":"Tribunal especial","en":"Special tribunal","ar":"محكمة خاصة"},{"es":"Víctimas civiles","en":"Civilian casualties","ar":"ضحايا مدنيون"},{"es":"Volatilidad de precios energéticos","en":"Energy price volatility","ar":"تقلب أسعار الطاقة"},{"es":"Zona de combate","en":"Combat zone","ar":"منطقة قتال"}
    ]
  },
  {
    "category": "Guerra subsidiaria",
    "terms": [
      {"es":"Guerra subsidiaria","en":"Proxy War","ar":"حرب الوكالة"},{"es":"Acción encubierta","en":"Covert Operation","ar":"عملية سرّية"},{"es":"Actor armado","en":"Armed Actor","ar":"فاعل مسلح"},{"es":"Actor no estatal","en":"Non-State Actor","ar":"فاعل غير دولتي"},{"es":"Acuerdo de alto el fuego","en":"Ceasefire Agreement","ar":"اتفاق وقف إطلاق النار"},{"es":"Agresión","en":"Aggression","ar":"عدوان"},{"es":"Alianza estratégica","en":"Strategic Alliance","ar":"تحالف استراتيجي"},{"es":"Alianza militar","en":"Military Alliance","ar":"تحالف عسكري"},{"es":"Alto el fuego","en":"Ceasefire","ar":"وقف إطلاق النار"},{"es":"Apoyo indirecto","en":"Indirect Support","ar":"دعم غير مباشر"},{"es":"Apoyo logístico","en":"Logistical Support","ar":"دعم لوجستي"},{"es":"Apoyo militar","en":"Military Support","ar":"دعم عسكري"},{"es":"Apoyo financiero externo","en":"External Financial Support","ar":"دعم مالي خارجي"},{"es":"Apoyo paramilitar","en":"Paramilitary Support","ar":"دعم شبه عسكري"},{"es":"Asistencia militar extranjera","en":"Foreign Military Assistance","ar":"مساعدة عسكرية أجنبية"},{"es":"Beligerante","en":"Belligerent Party","ar":"طرف محارب"},{"es":"Beligerancia indirecta","en":"Indirect Belligerency","ar":"حالة تحارب غير مباشرة"},{"es":"Bloque regional","en":"Regional Bloc","ar":"تكتل إقليمي"},{"es":"Bombardeo","en":"Bombardment","ar":"قصف"},{"es":"Brazo armado","en":"Armed Wing","ar":"ذراع مسلح"},{"es":"Campaña militar","en":"Military Campaign","ar":"حملة عسكرية"},{"es":"Capacidad defensiva","en":"Defensive Capability","ar":"قدرة دفاعية"},{"es":"Cese de hostilidades","en":"Cessation of Hostilities","ar":"وقف الأعمال العدائية"},{"es":"Coalición internacional","en":"International Coalition","ar":"ائتلاف دولي"},{"es":"Combate","en":"Combat","ar":"قتال"},{"es":"Conflicto armado","en":"Armed Conflict","ar":"نزاع مسلح"},{"es":"Conflicto prolongado","en":"Protracted Conflict","ar":"نزاع طويل الأمد"},{"es":"Conflicto regionalizado","en":"Regionalized Conflict","ar":"نزاع إقليمي الطابع"},{"es":"Confrontación indirecta","en":"Indirect Confrontation","ar":"مواجهة غير مباشرة"},{"es":"Contención","en":"Containment","ar":"احتواء"},{"es":"Control territorial","en":"Territorial Control","ar":"سيطرة إقليمية"},{"es":"Corredor humanitario","en":"Humanitarian Corridor","ar":"ممر إنساني"},{"es":"Crisis humanitaria","en":"Humanitarian Crisis","ar":"أزمة إنسانية"},{"es":"Desescalada","en":"De-escalation","ar":"خفض التصعيد"},{"es":"Desestabilización regional","en":"Regional Destabilization","ar":"زعزعة استقرار إقليمي"},{"es":"Desgaste militar","en":"Military Attrition","ar":"استنزاف عسكري"},{"es":"Despliegue militar","en":"Military Deployment","ar":"انتشار عسكري"},{"es":"Diplomacia","en":"Diplomacy","ar":"دبلوماسية"},{"es":"Disputa geopolítica","en":"Geopolitical Dispute","ar":"صراع جيوسياسي"},{"es":"Embargo","en":"Embargo","ar":"حظر"},{"es":"Enfrentamiento","en":"Clash / Confrontation","ar":"مواجهة"},{"es":"Escalada militar","en":"Military Escalation","ar":"تصعيد عسكري"},{"es":"Escenario de rivalidad","en":"Arena of Rivalry","ar":"ساحة تنافس"},{"es":"Estrategia militar","en":"Military Strategy","ar":"استراتيجية عسكرية"},{"es":"Estado cliente","en":"Client State","ar":"دولة تابعة"},{"es":"Financiamiento clandestino","en":"Clandestine Financing","ar":"تمويل سري"},{"es":"Fuerzas armadas","en":"Armed Forces","ar":"قوات مسلحة"},{"es":"Fuerzas rebeldes","en":"Rebel Forces","ar":"قوات متمردة"},{"es":"Gasto militar","en":"Military Expenditure","ar":"إنفاق عسكري"},{"es":"Guerra civil","en":"Civil War","ar":"حرب أهلية"},{"es":"Guerra delegada","en":"Delegated War","ar":"حرب مفوضة"},{"es":"Guerra fría","en":"Cold War","ar":"حرب باردة"},{"es":"Guerra híbrida","en":"Hybrid War","ar":"حرب هجينة"},{"es":"Guerra por delegación","en":"Proxy War","ar":"حرب بالإنابة"},{"es":"Hegemonía regional","en":"Regional Hegemony","ar":"هيمنة إقليمية"},{"es":"Hostilidades","en":"Hostilities","ar":"أعمال عدائية"},{"es":"Injerencia extranjera","en":"Foreign Interference","ar":"تدخل أجنبي"},{"es":"Influencia indirecta","en":"Indirect Influence","ar":"نفوذ غير مباشر"},{"es":"Insurgencia","en":"Insurgency","ar":"تمرد"},{"es":"Intereses estratégicos","en":"Strategic Interests","ar":"مصالح استراتيجية"},{"es":"Intervención militar","en":"Military Intervention","ar":"تدخل عسكري"},{"es":"Invasión","en":"Invasion","ar":"غزو"},{"es":"Legitimidad internacional","en":"International Legitimacy","ar":"شرعية دولية"},{"es":"Maniobra indirecta","en":"Indirect Maneuver","ar":"مناورة غير مباشرة"},{"es":"Milicia","en":"Militia","ar":"ميليشيا"},{"es":"Milicia aliada","en":"Allied Militia","ar":"ميليشيا حليفة"},{"es":"Movilización militar","en":"Military Mobilization","ar":"تعبئة عسكرية"},{"es":"Negociaciones de paz","en":"Peace Negotiations","ar":"مفاوضات سلام"},{"es":"Operación militar","en":"Military Operation","ar":"عملية عسكرية"},{"es":"Patrocinador externo","en":"External Sponsor","ar":"راعٍ خارجي"},{"es":"Potencia regional","en":"Regional Power","ar":"قوة إقليمية"},{"es":"Proyección de poder","en":"Power Projection","ar":"إسقاط القوة"},{"es":"Red de apoyo externo","en":"External Support Network","ar":"شبكة دعم خارجية"},{"es":"Rivalidad geopolítica","en":"Geopolitical Rivalry","ar":"تنافس جيوسياسي"},{"es":"Sanciones económicas","en":"Economic Sanctions","ar":"عقوبات اقتصادية"},{"es":"Seguridad nacional","en":"National Security","ar":"أمن قومي"},{"es":"Soberanía nacional","en":"National Sovereignty","ar":"سيادة وطنية"},{"es":"Suministro de armas","en":"Arms Supply","ar":"تزويد بالسلاح"},{"es":"Teatro secundario de guerra","en":"Secondary Theater of War","ar":"مسرح حرب ثانوي"},{"es":"Tensión regional","en":"Regional Tension","ar":"توتر إقليمي"},{"es":"Transferencia de armamento","en":"Arms Transfer","ar":"نقل تسليح"},{"es":"Zona de influencia","en":"Sphere of Influence","ar":"منطقة نفوذ"}
    ]
  }
];

async function seed() {
  await connectDB();
  
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalCategories = 0;

  for (const group of DATA) {
    // Find or create category
    let cat = await Category.findOne({ name: group.category });
    if (!cat) {
      cat = await Category.create({ name: group.category, description: '', order: totalCategories });
      console.log(`✅ Created category: "${group.category}"`);
      totalCategories++;
    } else {
      console.log(`📂 Category exists: "${group.category}"`);
    }

    for (const term of group.terms) {
      const en = (term.en || '').trim();
      const ar = (term.ar || '').trim();
      const es = (term.es || '').trim();

      // Check for duplicate (exact match on any 2 fields)
      const existing = await GlossaryTerm.findOne({
        category: cat._id,
        $or: [
          { termEn: en, termAr: ar },
          { termEn: en, termEs: es },
          { termAr: ar, termEs: es }
        ]
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      await GlossaryTerm.create({
        category: cat._id,
        termEn: en,
        termAr: ar,
        termEs: es
      });
      totalCreated++;
    }
    
    console.log(`   → ${group.terms.length} terms processed for "${group.category}"`);
  }

  console.log(`\n════════════════════════════════`);
  console.log(`✅ Created: ${totalCreated} terms`);
  console.log(`⏭️  Skipped: ${totalSkipped} duplicates`);
  console.log(`📂 Categories: ${totalCategories} new`);
  console.log(`════════════════════════════════`);
  
  process.exit(0);
}

seed().catch(e => { console.error('SEED ERROR:', e); process.exit(1); });
