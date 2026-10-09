/* ==========================================================================
   MBÄFEUNG calendar — data engine (extracted verbatim in logic from the
   original source file) + rebuilt navigation for a full-screen mobile app.
   ========================================================================== */
(function(){

/* ---------------- data (extracted, unchanged) ---------------- */
var WEEKDAY_FULL = ["Seondei","Mondei","Aptämondei","Mindrewohk","Tosdey","Fradey","Sasdey"]; // 0=Sun..6=Sat
var WEEKDAY_ABBR = ["Seo","Mon","Apt","Min","Tos","Fra","Sas"];
var WEEKDAY_ABBR_GREG = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
var WEEKDAY_ABBR_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
var WEEKDAY_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
var WEEKDAY_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var MONDAY_FIRST = [1,2,3,4,5,6,0];

var MONTH_FULL = ["Ndeungmbi Sang","Sang puoh","Sang tare","Sang lekuoh","Sang taa","Sang nteoghe","Sang saambuoh","Sang lefaa","Sang lepfeu'u","Sang leghem","Sang ntsapmo'","Sang ntsappuoh"];
var MONTH_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
var MONTH_FR_ABBR = ["Jan","Fév","Mar","Avr","Mai","Jui","Juil","Aoû","Sep","Oct","Nov","Déc"];
var MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var MONTH_EN_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var CYCLE_ABBR = ["Shw","Lep","Leg","Nwi","Peo","Nwe","Nka","Mbe"];
var CYCLE_FULL = ["Shwi'i","Lepare","Legheo","Ntchwi","Peombwoh'oh","Ntchwohre","Nkap","Mbei'i"];

function cyclePosFor(y,m,d){
    var anchor = Date.UTC(2026,0,1);
    var target = Date.UTC(y,m,d);
    var diffDays = Math.round((target - anchor) / 86400000);
    return ((diffDays % 8) + 8) % 8;
}
function cycleAbbrFor(y,m,d){ return CYCLE_ABBR[cyclePosFor(y,m,d)]; }
function cycleFullFor(y,m,d){ return CYCLE_FULL[cyclePosFor(y,m,d)]; }

function buildLocalSentence(date){
    var weekdayName = WEEKDAY_FULL[date.getDay()];
    var cycleName = cycleFullFor(date.getFullYear(), date.getMonth(), date.getDate()).toLowerCase();
    return weekdayName + " " + cycleName + ", ley'ey " + date.getDate() + ", le " + MONTH_FULL[date.getMonth()].toLowerCase() + ", le ngeu' " + date.getFullYear();
}
function buildFrSentence(date){
    var cycleName = cycleFullFor(date.getFullYear(), date.getMonth(), date.getDate()).toLowerCase();
    return WEEKDAY_FR[date.getDay()] + " " + cycleName + ", " + date.getDate() + " " + MONTH_FR[date.getMonth()].toLowerCase() + " " + date.getFullYear();
}
function buildEnSentence(date){
    var cycleName = cycleFullFor(date.getFullYear(), date.getMonth(), date.getDate()).toLowerCase();
    return WEEKDAY_EN[date.getDay()] + " " + cycleName + ", " + date.getDate() + " " + MONTH_EN[date.getMonth()] + " " + date.getFullYear();
}

function yearAnchorDiffDays(date){
    var y = date.getFullYear();
    var anchor = Date.UTC(y,0,1);
    var target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((target - anchor) / 86400000);
}
function weekStartFor(date){
    var y = date.getFullYear();
    var diff = yearAnchorDiffDays(date);
    var blockStart = Math.floor(diff/8) * 8;
    var anchor = new Date(Date.UTC(y,0,1));
    var start = new Date(anchor.getTime() + blockStart * 86400000);
    return new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
}
function weekNumberFor(date){
    var diff = yearAnchorDiffDays(date);
    return Math.floor(diff/8) + 1;
}

var today = new Date();
var todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();

/* ---------------- daily rollover ----------------
   The favicon and home-screen icons are the static Mbäfeung logo (icon-144/192/512.png)
   at all times — no per-day icon redraw. This interval just keeps the app's internal
   "today" in sync if the app is left open across local midnight. */
setInterval(function(){ // re-check at each hour boundary so "today" flips over at local midnight without a reload
    var t = new Date();
    if(t.getHours() === 0 && t.getMinutes() < 2){ todayY = t.getFullYear(); todayM = t.getMonth(); todayD = t.getDate(); render(); }
}, 60000);

/* ---------------- state ---------------- */
var LEVELS = ["day","week","month","year"];
var state = { level:"day", date:new Date() };
var pendingTransition = null; // "zoom-in" | "zoom-out" | "slide-prev" | "slide-next" | null

var panels = {
    day: document.getElementById("panel-day"),
    week: document.getElementById("panel-week"),
    month: document.getElementById("panel-month"),
    year: document.getElementById("panel-year")
};
var navPrev = document.getElementById("navPrev");
var navNext = document.getElementById("navNext");
var downloadFab = document.getElementById("downloadFab");
var todayBadgeNum = document.getElementById("todayBadgeNum");
document.getElementById("copyYear").textContent = "© Metaglossia " + new Date().getFullYear();
todayBadgeNum.textContent = todayD;

function showOnly(level){
    LEVELS.forEach(function(l){ panels[l].hidden = (l !== level); });
    var el = panels[level];
    if(pendingTransition){
        el.classList.remove("cal-anim-zoom-in","cal-anim-zoom-out","cal-anim-slide-prev","cal-anim-slide-next");
        void el.offsetWidth;
        el.classList.add("cal-anim-" + pendingTransition);
        pendingTransition = null;
    }
}

function render(){
    downloadFab.hidden = !(state.level === "month" || state.level === "year");
    navPrev.hidden = false; navNext.hidden = false;
    Array.prototype.forEach.call(drawer.querySelectorAll("button[data-level]"), function(btn){
        btn.classList.toggle("current", btn.getAttribute("data-level") === state.level);
    });
    if(state.level === "day"){ showOnly("day"); renderDayView(); }
    else if(state.level === "week"){ showOnly("week"); renderWeekView(); }
    else if(state.level === "month"){ showOnly("month"); renderMonthView(); }
    else { showOnly("year"); renderYearView(); }
}

function renderDayView(){
    var d = state.date;
    document.getElementById("day-weekday").innerHTML = WEEKDAY_FULL[d.getDay()] + " " + cycleFullFor(d.getFullYear(), d.getMonth(), d.getDate()).toLowerCase() + "<small>(" + WEEKDAY_ABBR_GREG[d.getDay()] + "/" + WEEKDAY_ABBR_EN[d.getDay()] + ")</small>";
    document.getElementById("day-num").textContent = d.getDate();
    document.getElementById("day-monthyear").innerHTML = MONTH_FULL[d.getMonth()] + " " + d.getFullYear() + "<small>(" + MONTH_FR_ABBR[d.getMonth()] + "/" + MONTH_EN_ABBR[d.getMonth()] + ")</small>";
    document.getElementById("day-sentence").innerHTML =
        "<div>" + buildLocalSentence(d) + "</div>" +
        "<div>" + buildFrSentence(d) + "</div>" +
        "<div>" + buildEnSentence(d) + "</div>";
}

function buildWeekdaysRow(target){
    target.innerHTML = "";
    MONDAY_FIRST.forEach(function(idx){
        var el = document.createElement("div");
        el.textContent = WEEKDAY_ABBR[idx];
        if(idx === 0){ el.classList.add("seo"); }
        target.appendChild(el);
    });
}

function makeDayCell(d){
    var cell = document.createElement("div");
    cell.className = "day-cell";
    if(d.getDay() === 0 || cyclePosFor(d.getFullYear(), d.getMonth(), d.getDate()) === 2){ cell.classList.add("red"); }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-cellnum" + (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD ? " today" : "");
    btn.textContent = d.getDate();
    btn.setAttribute("aria-label", buildEnSentence(d));
    btn.addEventListener("click", function(){ pendingTransition = "zoom-in"; state.level = "day"; state.date = new Date(d); render(); });
    cell.appendChild(btn);
    var cyc = document.createElement("span");
    cyc.className = "day-cellcycle";
    cyc.textContent = cycleAbbrFor(d.getFullYear(), d.getMonth(), d.getDate());
    cell.appendChild(cyc);
    return cell;
}

function renderWeekView(){
    var start = weekStartFor(state.date);
    document.getElementById("week-t1").innerHTML = "Ngap <span class=\"wk-abbr\">(Sem/Wk)</span> • " + weekNumberFor(state.date);
    document.getElementById("week-t2").textContent = state.date.getFullYear();
    buildWeekdaysRow(document.getElementById("week-weekdaysrow"));
    var grid = document.getElementById("week-daysgrid");
    grid.innerHTML = "";
    var offset = (start.getDay() + 6) % 7;
    for(var i=0;i<offset;i++){
        var blank = document.createElement("div");
        blank.className = "day-cell empty";
        blank.innerHTML = "<span class=\"day-cellnum\">0</span>";
        grid.appendChild(blank);
    }
    for(var i2=0;i2<8;i2++){
        var d = new Date(start); d.setDate(d.getDate() + i2);
        grid.appendChild(makeDayCell(d));
    }
}

function renderMonthView(){
    var y = state.date.getFullYear(), m = state.date.getMonth();
    document.getElementById("month-t1").innerHTML = MONTH_FULL[m] + " <span class=\"mo-abbr\">(" + MONTH_FR_ABBR[m] + "/" + MONTH_EN_ABBR[m] + ")</span>";
    document.getElementById("month-t2").textContent = y;
    buildWeekdaysRow(document.getElementById("month-weekdaysrow"));
    var grid = document.getElementById("month-daysgrid");
    grid.innerHTML = "";
    var firstDay = new Date(y,m,1);
    var offset = (firstDay.getDay() + 6) % 7;
    var totalDays = new Date(y,m+1,0).getDate();
    for(var i=0;i<offset;i++){
        var blank = document.createElement("div");
        blank.className = "day-cell empty";
        blank.innerHTML = "<span class=\"day-cellnum\">0</span>";
        grid.appendChild(blank);
    }
    for(var day=1; day<=totalDays; day++){ grid.appendChild(makeDayCell(new Date(y,m,day))); }
}

function makeMiniMonth(y,m){
    var wrap = document.createElement("div");
    wrap.className = "minimonth" + (y===todayY && m===todayM ? " current" : "");
    wrap.setAttribute("role","button"); wrap.setAttribute("tabindex","0");
    wrap.setAttribute("aria-label", MONTH_FULL[m] + " — open month view");
    var goToMonth = function(){ pendingTransition = "zoom-in"; state.level = "month"; state.date = new Date(y,m,1); render(); };
    wrap.addEventListener("click", goToMonth);
    wrap.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goToMonth(); } });

    var title = document.createElement("div");
    title.className = "minimonth-title";
    title.textContent = MONTH_FULL[m];
    wrap.appendChild(title);

    var abbr = document.createElement("div");
    abbr.className = "minimonth-abbr";
    abbr.textContent = MONTH_FR_ABBR[m] + "/" + MONTH_EN_ABBR[m];
    wrap.appendChild(abbr);

    var wdRow = document.createElement("div");
    wdRow.className = "miniweekdays";
    MONDAY_FIRST.forEach(function(idx){
        var el = document.createElement("span");
        el.textContent = WEEKDAY_ABBR[idx].slice(0,1);
        if(idx===0){ el.classList.add("seo"); }
        wdRow.appendChild(el);
    });
    wrap.appendChild(wdRow);

    var grid = document.createElement("div");
    grid.className = "minidays";
    var firstDay = new Date(y,m,1);
    var offset = (firstDay.getDay() + 6) % 7;
    var totalDays = new Date(y,m+1,0).getDate();
    for(var i=0;i<offset;i++){
        var blank = document.createElement("span");
        blank.className = "miniday empty";
        grid.appendChild(blank);
    }
    for(var d=1; d<=totalDays; d++){
        var dayEl = document.createElement("span");
        dayEl.className = "miniday" + (y===todayY && m===todayM && d===todayD ? " today" : "");
        if(new Date(y,m,d).getDay()===0 || cyclePosFor(y,m,d)===2){ dayEl.className += " red"; }
        var numSpan = document.createElement("span");
        numSpan.textContent = d;
        dayEl.appendChild(numSpan);
        var cycSpan = document.createElement("span");
        cycSpan.className = "miniday-cycle";
        cycSpan.textContent = cycleAbbrFor(y,m,d);
        dayEl.appendChild(cycSpan);
        grid.appendChild(dayEl);
    }
    wrap.appendChild(grid);
    return wrap;
}

function renderYearView(){
    var y = state.date.getFullYear();
    document.getElementById("year-title").textContent = y;
    var container = document.getElementById("year-grid");
    container.innerHTML = "";
    for(var m=0;m<12;m++){ container.appendChild(makeMiniMonth(y,m)); }
}

/* ---------------- navigation: hamburger drawer ---------------- */
var LEVEL_DEPTH = { day:0, week:1, month:2, year:3 };
var hamburger = document.getElementById("hamburger");
var drawer = document.getElementById("drawer");
var scrim = document.getElementById("scrim");

function openDrawer(){ drawer.classList.add("open"); scrim.classList.add("open"); }
function closeDrawer(){ drawer.classList.remove("open"); scrim.classList.remove("open"); }
hamburger.addEventListener("click", function(e){ e.stopPropagation(); if(drawer.classList.contains("open")){ closeDrawer(); } else { openDrawer(); } });
scrim.addEventListener("click", closeDrawer);

function goToLevel(newLevel){
    if(newLevel === state.level){ closeDrawer(); return; }
    pendingTransition = LEVEL_DEPTH[newLevel] > LEVEL_DEPTH[state.level] ? "zoom-out" : "zoom-in";
    state.level = newLevel;
    closeDrawer();
    render();
}
Array.prototype.forEach.call(drawer.querySelectorAll("button[data-level]"), function(btn){
    btn.addEventListener("click", function(){ goToLevel(btn.getAttribute("data-level")); });
});

/* ---------------- today badge: always returns to the day panel showing today,
   regardless of whatever panel/level was active when it was tapped ---------------- */
document.getElementById("todayBadge").addEventListener("click", function(){
    pendingTransition = "zoom-in";
    state.level = "day";
    state.date = new Date();
    render();
});

/* ---------------- brand dropdown: language picker ---------------- */
var brandChevron = document.getElementById("brandChevron");
var langMenu = document.getElementById("langMenu");
var brandText = document.getElementById("brandText");
function openLangMenu(){ langMenu.classList.add("open"); }
function closeLangMenu(){ langMenu.classList.remove("open"); }
brandChevron.addEventListener("click", function(e){
    e.stopPropagation();
    if(langMenu.classList.contains("open")){ closeLangMenu(); } else { openLangMenu(); }
});
Array.prototype.forEach.call(langMenu.querySelectorAll("button"), function(btn){
    btn.addEventListener("click", function(){
        brandText.textContent = btn.getAttribute("data-lang");
        closeLangMenu();
    });
});
document.addEventListener("click", function(e){
    if(langMenu.classList.contains("open") && !langMenu.contains(e.target) && e.target !== brandChevron){ closeLangMenu(); }
});

/* ---------------- drawer: contact popup ---------------- */
var contactDrawerBtn = document.getElementById("contactDrawerBtn");
var contactScrim = document.getElementById("contactScrim");
var contactPopup = document.getElementById("contactPopup");
var contactClose = document.getElementById("contactClose");
var contactForm = document.getElementById("contactForm");
function openContactPopup(){ contactPopup.classList.add("open"); contactScrim.classList.add("open"); }
function closeContactPopup(){ contactPopup.classList.remove("open"); contactScrim.classList.remove("open"); }
contactDrawerBtn.addEventListener("click", function(){ closeDrawer(); openContactPopup(); });
contactClose.addEventListener("click", closeContactPopup);
contactScrim.addEventListener("click", closeContactPopup);
contactForm.addEventListener("submit", function(e){
    e.preventDefault();
    contactForm.reset();
    closeContactPopup();
});

/* ---------------- prev/next chevrons + swipe left/right (step within level) ---------------- */
function stepLevel(dir){
    pendingTransition = dir < 0 ? "slide-prev" : "slide-next";
    if(state.level === "day"){ state.date.setDate(state.date.getDate() + dir); }
    else if(state.level === "week"){ state.date.setDate(state.date.getDate() + dir*8); }
    else if(state.level === "month"){ state.date.setMonth(state.date.getMonth() + dir); }
    else if(state.level === "year"){ state.date.setFullYear(state.date.getFullYear() + dir); }
    render();
}
navPrev.addEventListener("click", function(){ stepLevel(-1); });
navNext.addEventListener("click", function(){ stepLevel(1); });

/* ---------------- swipe up/down (zoom out/in through day->week->month->year) ---------------- */
function broaden(){ // swipe up
    var idx = LEVEL_DEPTH[state.level];
    if(idx >= 3){ return; } // year: swiping up does nothing
    pendingTransition = "zoom-out";
    state.level = LEVELS[idx+1];
    render();
}
function narrow(){ // swipe down
    var idx = LEVEL_DEPTH[state.level];
    if(idx <= 0){ return; } // day: swiping down does nothing
    pendingTransition = "zoom-in";
    state.level = LEVELS[idx-1];
    render();
}

var stage = document.getElementById("stage");
var touchStartX = 0, touchStartY = 0, touchActive = false;
var SWIPE_THRESHOLD = 45;
stage.addEventListener("touchstart", function(e){
    if(e.touches.length !== 1){ return; }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
}, { passive:true });
stage.addEventListener("touchend", function(e){
    if(!touchActive){ return; }
    touchActive = false;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD){ return; }
    if(Math.abs(dx) > Math.abs(dy)){
        stepLevel(dx < 0 ? 1 : -1); // swipe left -> next, swipe right -> prev
    } else {
        if(dy < 0){ broaden(); } else { narrow(); }
    }
}, { passive:true });

/* ---------------- search popup (unchanged look/functionality) ---------------- */
var searchToggle = document.getElementById("searchToggle");
var searchpopup = document.getElementById("searchpopup");
var searchgo = document.getElementById("searchgo");
var fDay = document.getElementById("sday"), fMonth = document.getElementById("smonth"), fYear = document.getElementById("syear");

function openSearch(){
    searchpopup.classList.add("open");
    fDay.value = state.date.getDate();
    fMonth.value = state.date.getMonth()+1;
    fYear.value = state.date.getFullYear();
    [fDay,fMonth,fYear].forEach(function(i){ i.classList.remove("invalid"); });
    fDay.focus();
}
function closeSearch(){ searchpopup.classList.remove("open"); }
searchToggle.addEventListener("click", function(e){ e.stopPropagation(); if(searchpopup.classList.contains("open")){ closeSearch(); } else { openSearch(); } });
document.addEventListener("click", function(e){
    if(searchpopup.classList.contains("open") && !searchpopup.contains(e.target) && e.target !== searchToggle){ closeSearch(); }
});

function digitsOnly(s){ return s.replace(/[^0-9]/g,""); }
function digitsAndMinus(s){ return s.replace(/[^0-9-]/g,"").replace(/(.)-/g,"$1"); }
function validateDay(){ var v=fDay.value,n=parseInt(v,10); var bad = v!=="" && (isNaN(n)||n<1||n>31); fDay.classList.toggle("invalid",bad); return v!=="" && !bad; }
function validateMonth(){ var v=fMonth.value,n=parseInt(v,10); var bad = v!=="" && (isNaN(n)||n<1||n>12); fMonth.classList.toggle("invalid",bad); return v!=="" && !bad; }
function validateYear(){ var v=fYear.value,n=parseInt(v,10); var bad = v!=="" && (isNaN(n)||n<0); fYear.classList.toggle("invalid",bad); return v!=="" && !bad; }
fDay.addEventListener("input", function(){ fDay.value = digitsOnly(fDay.value).slice(0,2); validateDay(); if(fDay.value.length===2){ fMonth.focus(); } });
fMonth.addEventListener("input", function(){ fMonth.value = digitsOnly(fMonth.value).slice(0,2); validateMonth(); if(fMonth.value.length===2){ fYear.focus(); } });
fYear.addEventListener("input", function(){ fYear.value = digitsAndMinus(fYear.value); validateYear(); });

function runSearch(){
    var dOk=validateDay(), mOk=validateMonth(), yOk=validateYear();
    if(!dOk||!mOk||!yOk){ return; }
    var dd=parseInt(fDay.value,10), mm=parseInt(fMonth.value,10), yy=parseInt(fYear.value,10);
    var found = new Date(0);
    found.setFullYear(yy, mm-1, dd);
    closeSearch();
    pendingTransition = "zoom-in";
    state.level = "day";
    state.date = found;
    render();
}
searchgo.addEventListener("click", function(e){ e.stopPropagation(); runSearch(); });
[fDay,fMonth,fYear].forEach(function(i){ i.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } }); });

/* ---------------- share: screenshots the current panel ---------------- */
document.getElementById("shareBtn").addEventListener("click", function(){
    var el = panels[state.level];
    if(typeof html2canvas !== "function"){ if(navigator.share){ navigator.share({ title:"Mbäfeung", url:location.href }); } return; }
    html2canvas(el, { backgroundColor:"#141414" }).then(function(canvas){
        canvas.toBlob(function(blob){
            var file = new File([blob], "Mbäfeung-" + state.level + ".png", { type:"image/png" });
            if(navigator.canShare && navigator.canShare({ files:[file] })){
                navigator.share({ title:"Mbäfeung", text:"Mbäfeung.com", url:location.href, files:[file] }).catch(function(){});
            } else if(navigator.share){
                navigator.share({ title:"Mbäfeung", text:"Mbäfeung.com", url:location.href }).catch(function(){});
            } else {
                var link = document.createElement("a");
                link.href = canvas.toDataURL("image/png");
                link.download = "Mbäfeung-" + state.level + ".png";
                link.click();
            }
        });
    });
});

/* ---------------- download: PDF export (month/year), logic kept identical to source ---------------- */
var PDF_WEEKDAY_HEADER = ["Mondei","Aptämondei","Mindrewohk","Tosdey","Fradey","Sasdey","Seondei"];
var PDF_WEEKDAY_Mbafeung = ["Lun/Mon","Mar/Tues","Mer/Wed","Jeu/Thu","Ven/Fri","Sam/Sat","Dim/Sun"];
var PDF_RED = [153,27,30];
var PDF_GRAY = [100,100,100];

function drawMonthPage(doc, y, m, pageIndex, pageTotal){
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var marginX = 36;

    doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(PDF_RED[0],PDF_RED[1],PDF_RED[2]);
    doc.text(String(y), pageWidth/2, 32, { align:"center" });
    doc.setFontSize(11); doc.setTextColor(0,0,0);
    doc.text("Ngeu'la' Mbäfeung – Calendrier grégorien - Gregorian calendar", pageWidth/2, 48, { align:"center" });
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(PDF_GRAY[0],PDF_GRAY[1],PDF_GRAY[2]);
    doc.text("REFERENCE: 1. Shwi'i | 2. Lepare | 3. Legheo | 4. Ntchwi | 5. Peombwoh'oh | 6. Ntchwohre | 7. Nkap | 8. Mbei'i", pageWidth/2, 61, { align:"center" });
    doc.setDrawColor(190); doc.setLineWidth(0.5); doc.line(marginX,70,pageWidth-marginX,70);

    doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(PDF_RED[0],PDF_RED[1],PDF_RED[2]);
    var frName = MONTH_FR[m].charAt(0).toUpperCase() + MONTH_FR[m].slice(1);
    doc.text("Sang " + (m+1) + " (" + MONTH_FULL[m] + ")" + " / " + frName + " / " + MONTH_EN[m], pageWidth/2, 94, { align:"center" });

    var gridTop = 120, footerTop = pageHeight - 44, cols = 7;
    var gridWidth = pageWidth - marginX*2, colWidth = gridWidth/cols, cellsTop = gridTop + 20;
    var firstDay = new Date(y,m,1), offset = (firstDay.getDay()+6)%7;
    var totalDays = new Date(y,m+1,0).getDate();
    var rows = Math.ceil((offset+totalDays)/7);
    var rowHeight = (footerTop - 12 - cellsTop) / rows;

    doc.setFontSize(9);
    for(var c=0;c<cols;c++){
        var cx = marginX + c*colWidth + colWidth/2;
        var sunCol = (c===6);
        doc.setFont("helvetica","bold"); doc.setFontSize(10);
        doc.setTextColor(sunCol?PDF_RED[0]:0, sunCol?PDF_RED[1]:0, sunCol?PDF_RED[2]:0);
        doc.text(PDF_WEEKDAY_HEADER[c], cx, gridTop, { align:"center" });
        doc.setFont("helvetica","normal");
        doc.text(PDF_WEEKDAY_Mbafeung[c], cx, gridTop+11, { align:"center" });
    }

    doc.setDrawColor(60); doc.setLineWidth(1);
    doc.rect(marginX, cellsTop, gridWidth, rows*rowHeight);
    doc.line(marginX, cellsTop, pageWidth-marginX, cellsTop);
    doc.setDrawColor(190); doc.setLineWidth(0.5);
    for(var rr=1;rr<rows;rr++){ var ly=cellsTop+rr*rowHeight; doc.line(marginX,ly,pageWidth-marginX,ly); }
    for(var cc=1;cc<cols;cc++){ var lx=marginX+cc*colWidth; doc.line(lx,cellsTop,lx,cellsTop+rows*rowHeight); }

    var dayNum = 1;
    for(var r=0;r<rows;r++){
        for(var c2=0;c2<cols;c2++){
            var idx = r*7+c2;
            if(idx<offset || dayNum>totalDays){ continue; }
            var cyclePos = cyclePosFor(y,m,dayNum);
            var isRed = (c2===6) || (cyclePos===2);
            var cx2 = marginX + c2*colWidth + colWidth/2;
            var cy2 = cellsTop + r*rowHeight + rowHeight*0.42;
            doc.setTextColor(isRed?PDF_RED[0]:0, isRed?PDF_RED[1]:0, isRed?PDF_RED[2]:0);
            doc.setFont("helvetica","thin"); doc.setFontSize(20);
            doc.text(String(dayNum), cx2, cy2+5, { align:"center" });
            doc.setFont("helvetica","bold"); doc.setFontSize(10);
            doc.text(cycleFullFor(y,m,dayNum), cx2, cy2+20, { align:"center" });
            dayNum++;
        }
    }

    doc.setDrawColor(190); doc.setLineWidth(0.5);
    doc.line(marginX, footerTop, pageWidth-marginX, footerTop);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(PDF_GRAY[0],PDF_GRAY[1],PDF_GRAY[2]);
    doc.text(y + "  |  Ngeu'la' Mbäfeung – Calendrier grégorien - Gregorian calendar", pageWidth/2, footerTop+13, { align:"center" });
    doc.text("REFERENCE: 1. Shwi'i | 2. Lepare | 3. Legheo | 4. Ntchwi | 5. Peombwoh'oh | 6. Ntchwohre | 7. Nkap | 8. Mbei'i", pageWidth/2, footerTop+24, { align:"center" });
    doc.setTextColor(170,170,170); doc.setFontSize(10);
    doc.text(pageIndex+"/"+pageTotal, pageWidth-marginX, footerTop+24, { align:"right" });
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(150,150,150);
    doc.text("AMT" + " © " + "Metaglossia " + new Date().getFullYear(), pageWidth/2, footerTop+34, { align:"center" });
    doc.setTextColor(0,0,0);
}

downloadFab.addEventListener("click", function(){
    if(!window.jspdf || typeof window.jspdf.jsPDF !== "function"){ return; }
    var doc = new window.jspdf.jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    if(state.level === "month"){
        var my = state.date.getFullYear(), mm = state.date.getMonth();
        drawMonthPage(doc, my, mm, mm+1, 12);
        doc.save("Mbäfeung-Sang" + (mm+1) + "(" + MONTH_FULL[mm].toLowerCase() + ")" + "-" + MONTH_FR[mm].toLowerCase() + "-" + MONTH_EN[mm].toLowerCase() + "-" + my + ".pdf");
    } else if(state.level === "year"){
        var yy = state.date.getFullYear();
        for(var mi=0; mi<12; mi++){ if(mi>0){ doc.addPage(); } drawMonthPage(doc, yy, mi, mi+1, 12); }
        doc.save("Mbäfeung-calendar-" + yy + ".pdf");
    }
});

/* ---------------- boot ---------------- */
render();

})();
