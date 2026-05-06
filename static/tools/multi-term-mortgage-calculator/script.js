(function () {
    // ===== CONSTANTS =====
    var LS_KEY = "mortgage-calc-v2";
    var LS_COLLAPSED_KEY = "mortgage-calc-v2-collapsed";
    var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    var countryInfo = {
        ca: {
            bullets: [
                "<strong>Semi-annual compounding.</strong> Interest compounds twice a year, so the effective monthly rate is lower than rate/12.",
                "<strong>CMHC default insurance</strong> required when down payment is under 20%. Premium is a one-time cost added to the mortgage principal.",
                "<strong>Term vs amortization.</strong> Typical terms are 1-5 years at a fixed rate; the amortization is 25-30 years. Rate renegotiated at each renewal.",
                "<strong>Prepayment limits.</strong> Most lenders allow 10-20% lump sum per year and payment increases up to double. Penalties apply beyond that.",
            ],
        },
        us: {
            bullets: [
                "<strong>Monthly compounding.</strong> Interest is calculated at rate/12 each month. The quoted rate equals the effective rate.",
                "<strong>30-year fixed</strong> is the most common mortgage. You lock the rate for the entire loan. No renewals.",
                "<strong>No CMHC.</strong> PMI is out of scope for this calculator.",
            ],
        },
    };

    var countryConfig = {
        ca: {
            defaultAmort: 25,
            maxAmort: 30,
            defaultTerms: [
                { years: 5, rate: 4.99 },
                { years: 5, rate: 4.49 },
                { years: 5, rate: 4.19 },
                { years: 5, rate: 3.99 },
                { years: 5, rate: 3.79 },
            ],
            compounding: "semi-annual",
            newTermDuration: 5,
        },
        us: {
            defaultAmort: 30,
            maxAmort: 40,
            defaultTerms: [
                { years: 30, rate: 6.5 },
            ],
            compounding: "monthly",
            newTermDuration: 5,
        },
    };

    var frequencyConfig = {
        monthly:              { ppy: 12, label: "Monthly", suffix: "/mo" },
        semimonthly:          { ppy: 24, label: "Semi-monthly", suffix: "/semi-mo" },
        biweekly:             { ppy: 26, label: "Bi-weekly", suffix: "/bi-wk" },
        accelerated_biweekly: { ppy: 26, label: "Accelerated bi-weekly", suffix: "/bi-wk" },
        weekly:               { ppy: 52, label: "Weekly", suffix: "/wk" },
        accelerated_weekly:   { ppy: 52, label: "Accelerated weekly", suffix: "/wk" },
    };

    var scenarioPresetColors = ["#2ecc71", "#e74c3c", "#f39c12", "#9b59b6", "#1abc9c"];
    var baseColor = "#4f86c6";
    var termColorsLight = ["#111", "#4a4a4a", "#7a7a7a", "#a5a5a5", "#c5c5c5", "#333", "#5a5a5a", "#8a8a8a"];
    var termColorsDark  = ["#e0e0e0", "#b0b0b0", "#888888", "#666666", "#444444", "#ccc", "#999", "#777"];

    // ===== STATE =====
    var country = "ca";
    var terms = [];
    var scenarios = [];
    var paymentFrequency = "monthly";
    var firstTimeBuyer = false;
    var newBuild = false;
    var scheduleMode = "annual";
    var lastSimResults = null; // { base: sim, scenarios: { id: sim } }
    var chartInstances = {};
    var editingScenarioId = null;

    // ===== DOM HELPERS =====
    function $(id) { return document.getElementById(id); }

    // ===== MATH HELPERS =====

    function isDark() {
        return getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() !== "#fafafa";
    }

    function getTermColors() {
        return isDark() ? termColorsDark : termColorsLight;
    }

    function effectivePeriodRate(annualRate, frequency, compounding) {
        var ppy = frequencyConfig[frequency].ppy;
        if (compounding === "semi-annual") {
            var semiRate = annualRate / 100 / 2;
            return Math.pow(1 + semiRate, 2 / ppy) - 1;
        }
        return annualRate / 100 / ppy;
    }

    function calcMonthlyPayment(principal, annualRate, amortYears, compounding) {
        var r = effectivePeriodRate(annualRate, "monthly", compounding);
        var n = amortYears * 12;
        if (principal <= 0 || n <= 0) return 0;
        if (r === 0) return principal / n;
        return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    function calcPeriodicPayment(principal, annualRate, remainingAmortYears, frequency, compounding) {
        var monthlyPmt = calcMonthlyPayment(principal, annualRate, remainingAmortYears, compounding);
        switch (frequency) {
            case "monthly": return monthlyPmt;
            case "semimonthly": return monthlyPmt / 2;
            case "biweekly": return (monthlyPmt * 12) / 26;
            case "accelerated_biweekly": return monthlyPmt / 2;
            case "weekly": return (monthlyPmt * 12) / 52;
            case "accelerated_weekly": return monthlyPmt / 4;
            default: return monthlyPmt;
        }
    }

    // ===== CMHC =====

    function cmhcRate(downPct) {
        if (downPct < 5) return 4.0;
        if (downPct < 10) return 4.0;
        if (downPct < 15) return 3.1;
        if (downPct < 20) return 2.8;
        return 0;
    }

    function calcCmhcPremium(loanAmount, downPct) {
        if (downPct >= 20) return 0;
        return loanAmount * cmhcRate(downPct) / 100;
    }

    function getCmhcWarnings(homeValue, downPct, amortYears) {
        var warnings = [];
        if (downPct >= 20) return warnings;
        if (homeValue >= 1500000) {
            warnings.push("CMHC not available above $1.5M. 20% minimum down payment required.");
        }
        if (amortYears > 25 && !firstTimeBuyer && !newBuild) {
            warnings.push("CMHC requires maximum 25-year amortization. Check \"First-time buyer\" or \"New build\" for 30-year eligibility.");
        }
        if (amortYears > 30) {
            warnings.push("CMHC not available with amortization over 30 years.");
        }
        return warnings;
    }

    // ===== FORMATTING =====

    function addCommas(n) {
        var parts = n.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    function fmt(val) {
        return "$" + addCommas(Math.round(val));
    }

    function fmtFull(val) {
        var sign = val < 0 ? "-" : "";
        var abs = Math.abs(val);
        var rounded = Math.round(abs * 100) / 100;
        var parts = rounded.toFixed(2).split(".");
        return sign + "$" + addCommas(parseInt(parts[0])) + "." + parts[1];
    }

    function fmtPct(val) {
        return val.toFixed(1) + "%";
    }

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function freqSuffix() {
        return frequencyConfig[paymentFrequency] ? frequencyConfig[paymentFrequency].suffix : "/mo";
    }

    function freqLabel() {
        return frequencyConfig[paymentFrequency] ? frequencyConfig[paymentFrequency].label : "Monthly";
    }

    // ===== LOCAL STORAGE =====

    function saveState() {
        try {
            var state = {
                v: 2,
                country: country,
                homeValue: $("home-value").value,
                downPayment: $("down-payment").value,
                amortization: $("amortization").value,
                paymentIncrease: $("payment-increase").value,
                lumpSumAnnual: $("lump-sum-annual").value,
                lumpSumTerm: $("lump-sum-term").value,
                startMonth: $("start-month").value,
                startYear: $("start-year").value,
                scheduleMode: scheduleMode,
                paymentFrequency: paymentFrequency,
                firstTimeBuyer: firstTimeBuyer,
                newBuild: newBuild,
                scenarios: scenarios,
                terms: terms,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(state));
        } catch (e) {}
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }

    function migrateState(old) {
        if (!old) return null;
        if (old.v === 2) return old;
        var s = {
            v: 2,
            country: old.country || "ca",
            homeValue: old.homeValue || "500000",
            downPayment: old.downPayment || "100000",
            amortization: old.amortization || "25",
            paymentIncrease: old.paymentIncrease || "0",
            lumpSumAnnual: old.lumpSumAnnual || "0",
            lumpSumTerm: old.lumpSumTerm || "0",
            startMonth: old.startMonth || "5",
            startYear: old.startYear || "2026",
            scheduleMode: old.scheduleMode || "annual",
            paymentFrequency: "monthly",
            firstTimeBuyer: false,
            newBuild: false,
            terms: (old.terms || []).map(function (t) { return { years: t.years, rate: t.rate }; }),
            scenarios: [{ id: "base", label: "Base", locked: true, color: baseColor, visible: true }],
        };
        var optOffset = parseFloat(old.rateOptimistic) || 0;
        var pessOffset = parseFloat(old.ratePessimistic) || 0;
        if (optOffset !== 0) {
            s.scenarios.push({ id: "s1", label: "Optimistic", mode: "offset", offset: optOffset, color: "#2ecc71", visible: true });
        }
        if (pessOffset !== 0) {
            s.scenarios.push({ id: "s2", label: "Pessimistic", mode: "offset", offset: pessOffset, color: "#e74c3c", visible: true });
        }
        return s;
    }

    function clearState() {
        try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_COLLAPSED_KEY); } catch (e) {}
    }

    function applyState(s) {
        if (!s) return false;
        country = s.country || "ca";
        if (s.terms && s.terms.length > 0) terms = s.terms;
        if (s.scenarios && s.scenarios.length > 0) scenarios = s.scenarios;
        if (s.paymentFrequency) paymentFrequency = s.paymentFrequency;
        if (s.firstTimeBuyer !== undefined) firstTimeBuyer = s.firstTimeBuyer;
        if (s.newBuild !== undefined) newBuild = s.newBuild;
        if (s.scheduleMode) scheduleMode = s.scheduleMode;
        $("home-value").value = s.homeValue || "500000";
        $("down-payment").value = s.downPayment || "100000";
        $("amortization").value = s.amortization || "25";
        $("payment-increase").value = s.paymentIncrease || "0";
        $("lump-sum-annual").value = s.lumpSumAnnual || "0";
        $("lump-sum-term").value = s.lumpSumTerm || "0";
        $("start-month").value = s.startMonth || "5";
        $("start-year").value = s.startYear || "2026";
        return true;
    }

    // ===== COLLAPSIBLES =====

    var collapsibles = {
        scenarios: { toggle: $("toggle-scenarios"), body: $("body-scenarios"), arrow: $("arrow-scenarios") },
        prepay:    { toggle: $("toggle-prepay"),    body: $("body-prepay"),    arrow: $("arrow-prepay") },
        date:      { toggle: $("toggle-date"),      body: $("body-date"),      arrow: $("arrow-date") },
    };

    Object.keys(collapsibles).forEach(function (key) {
        var c = collapsibles[key];
        c.toggle.addEventListener("click", function () {
            var isOpen = !c.body.classList.contains("collapsed");
            c.body.classList.toggle("collapsed", isOpen);
            c.arrow.classList.toggle("open", !isOpen);
            saveCollapsedState();
        });
    });

    function saveCollapsedState() {
        try {
            var state = {};
            Object.keys(collapsibles).forEach(function (key) {
                state[key] = collapsibles[key].body.classList.contains("collapsed");
            });
            localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(state));
        } catch (e) {}
    }

    function loadCollapsedState() {
        try {
            var raw = localStorage.getItem(LS_COLLAPSED_KEY);
            if (!raw) return;
            var state = JSON.parse(raw);
            Object.keys(state).forEach(function (key) {
                if (collapsibles[key]) {
                    collapsibles[key].body.classList.toggle("collapsed", state[key]);
                    collapsibles[key].arrow.classList.toggle("open", !state[key]);
                }
            });
        } catch (e) {}
    }

    // ===== COUNTRY SWITCHING =====

    function renderCountryInfo() {
        var info = countryInfo[country];
        if (!info) { $("country-info").innerHTML = ""; return; }
        var label = country === "ca" ? "Canada" : "United States";
        var html = "<span class=\"country-info-label\">" + label + "</span><ul>";
        info.bullets.forEach(function (b) { html += "<li>" + b + "</li>"; });
        html += "</ul>";
        $("country-info").innerHTML = html;
    }

    function switchCountry(c) {
        country = c;
        $("btn-ca").classList.toggle("active", c === "ca");
        $("btn-us").classList.toggle("active", c === "us");
        var cfg = countryConfig[country];
        $("amortization").max = cfg.maxAmort;
        $("amortization").value = cfg.defaultAmort;
        terms = cfg.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate }; });
        paymentFrequency = "monthly";
        $("payment-frequency").value = "monthly";
        firstTimeBuyer = false;
        newBuild = false;
        $("first-time-buyer").checked = false;
        $("new-build").checked = false;
        renderTerms();
        syncLoan();
        renderCountryInfo();
        render();
        saveState();
    }

    $("btn-ca").addEventListener("click", function () { switchCountry("ca"); });
    $("btn-us").addEventListener("click", function () { switchCountry("us"); });

    // ===== LOAN SYNC =====

    function syncLoan() {
        var hv = parseFloat($("home-value").value) || 0;
        var dp = parseFloat($("down-payment").value) || 0;
        if (dp > hv) { dp = hv; $("down-payment").value = dp; }
        var loan = hv - dp;
        var pct = hv > 0 ? (dp / hv * 100) : 0;
        $("down-pct").textContent = pct.toFixed(0) + "%";

        var cmhcPremium = 0;
        var cmhcRow = $("cmhc-row");
        if (country === "ca" && loan > 0 && pct < 20) {
            cmhcPremium = calcCmhcPremium(loan, pct);
            loan += cmhcPremium;
            $("cmhc-amount").textContent = "CMHC insurance: " + fmt(cmhcPremium) + " added to principal";
            cmhcRow.style.display = "block";
            $("cmhc-eligibility").style.display = "flex";
            var warnings = getCmhcWarnings(hv, pct, parseInt($("amortization").value) || 25);
            var warnHtml = "";
            warnings.forEach(function (w) { warnHtml += "<div class=\"warning-text\">" + w + "</div>"; });
            $("cmhc-warnings").innerHTML = warnHtml;
        } else {
            cmhcRow.style.display = "none";
        }

        $("loan-amount").value = Math.round(loan);
    }

    $("home-value").addEventListener("input", syncLoan);
    $("down-payment").addEventListener("input", syncLoan);

    // ===== TERMS UI =====

    function renderTerms() {
        var termsList = $("terms-list");
        termsList.innerHTML = "";
        terms.forEach(function (term, i) {
            var maxDuration = country === "ca" ? 10 : 40;
            var card = document.createElement("div");
            card.className = "term-card";
            card.innerHTML =
                '<div class="term-card-header">' +
                '<h3>Term ' + (i + 1) + '</h3>' +
                (terms.length > 1 ? '<button class="remove-term" data-idx="' + i + '" title="Remove term">&times;</button>' : '') +
                '</div>' +
                '<div class="term-fields">' +
                '<div class="field"><label>Duration</label><div class="input-wrap"><input type="number" data-idx="' + i + '" data-field="years" value="' + term.years + '" min="1" max="' + maxDuration + '" step="1"><span class="suffix">yr</span></div></div>' +
                '<div class="field"><label>Rate</label><div class="input-wrap"><input type="number" data-idx="' + i + '" data-field="rate" value="' + term.rate + '" min="0" max="30" step="0.01"><span class="suffix">%</span></div></div>' +
                '</div>';
            termsList.appendChild(card);
        });

        termsList.querySelectorAll("input").forEach(function (el) {
            el.addEventListener("input", function () {
                var idx = parseInt(this.dataset.idx, 10);
                var field = this.dataset.field;
                terms[idx][field] = parseFloat(this.value) || 0;
                render();
            });
        });

        termsList.querySelectorAll(".remove-term").forEach(function (btn) {
            btn.addEventListener("click", function () {
                terms.splice(parseInt(btn.dataset.idx, 10), 1);
                renderTerms();
                render();
            });
        });
    }

    $("add-term").addEventListener("click", function () {
        var cfg = countryConfig[country];
        var lastRate = terms.length > 0 ? terms[terms.length - 1].rate : 5;
        terms.push({ years: cfg.newTermDuration, rate: Math.max(0.5, lastRate - 0.2) });
        renderTerms();
        render();
    });

    // ===== SCENARIO MANAGER =====

    function initScenarios() {
        scenarios = [
            { id: "base", label: "Base", locked: true, color: baseColor, visible: true },
        ];
    }

    function renderScenarioChips() {
        var container = $("scenario-chips");
        container.innerHTML = "";
        scenarios.forEach(function (sc) {
            var chip = document.createElement("span");
            chip.className = "scenario-chip" + (sc.visible ? " active" : "") + (sc.locked ? " locked" : "");
            chip.style.borderColor = sc.visible ? sc.color : "";
            chip.dataset.id = sc.id;
            chip.innerHTML =
                '<span class="chip-dot" style="background:' + sc.color + '"></span>' +
                sc.label +
                (!sc.locked ?
                    ' <button class="chip-edit" data-id="' + sc.id + '" title="Edit">&#9998;</button>' +
                    ' <button class="chip-delete" data-id="' + sc.id + '" title="Delete">&times;</button>'
                    : '');
            container.appendChild(chip);
        });

        container.querySelectorAll(".scenario-chip").forEach(function (el) {
            el.addEventListener("click", function (e) {
                if (e.target.classList.contains("chip-edit") || e.target.classList.contains("chip-delete")) return;
                var id = el.dataset.id;
                var sc = scenarios.find(function (s) { return s.id === id; });
                if (sc && !sc.locked) {
                    sc.visible = !sc.visible;
                    renderScenarioChips();
                    render();
                }
            });
        });

        container.querySelectorAll(".chip-edit").forEach(function (btn) {
            btn.addEventListener("click", function () { showScenarioEditor(btn.dataset.id); });
        });

        container.querySelectorAll(".chip-delete").forEach(function (btn) {
            btn.addEventListener("click", function () { deleteScenario(btn.dataset.id); });
        });
    }

    function showScenarioEditor(id) {
        var editor = $("scenario-editor");
        var sc = id ? scenarios.find(function (s) { return s.id === id; }) : null;
        editingScenarioId = id || null;

        var label = sc ? sc.label : "Scenario " + scenarios.length;
        var color = sc ? sc.color : getNextColor();
        var mode = sc ? (sc.mode || "offset") : "offset";
        var offset = sc ? (sc.offset || 0) : 0;
        var termRates = sc && sc.termRates ? sc.termRates.slice() : terms.map(function (t) { return t.rate; });

        var html =
            '<div class="input-row">' +
            '<div class="field"><label>Label</label><div class="input-wrap"><input type="text" id="sc-label-input" value="' + label + '"></div></div>' +
            '<div class="field"><label>Color</label><div class="color-swatches" id="sc-color-swatches">' +
            scenarioPresetColors.map(function (c) {
                return '<button class="color-swatch' + (c === color ? " selected" : "") + '" style="background:' + c + '" data-color="' + c + '"></button>';
            }).join("") +
            '</div></div>' +
            '</div>' +
            '<div class="input-row">' +
            '<div class="field"><label>Mode</label><select id="sc-mode-select">' +
            '<option value="offset"' + (mode === "offset" ? " selected" : "") + '>Offset from base</option>' +
            '<option value="custom"' + (mode === "custom" ? " selected" : "") + '>Custom rates</option>' +
            '</select></div>' +
            '<div class="field" id="sc-offset-field"' + (mode !== "offset" ? ' style="display:none"' : '') + '><label>Offset</label><div class="input-wrap"><input type="number" id="sc-offset-input" value="' + offset + '" step="0.25"><span class="suffix">%</span></div></div>' +
            '</div>' +
            '<div id="sc-custom-rates"' + (mode !== "custom" ? ' style="display:none"' : '') + '>' +
            '<div class="custom-rates-list">' +
            terms.map(function (t, i) {
                return '<div class="custom-rate-row"><span class="term-label">Term ' + (i + 1) + '</span><div class="input-wrap"><input type="number" class="sc-custom-rate" data-idx="' + i + '" value="' + (termRates[i] !== undefined ? termRates[i] : t.rate) + '" step="0.01"><span class="suffix">%</span></div></div>';
            }).join("") +
            '</div></div>' +
            '<div class="scenario-editor-actions">' +
            '<button class="btn-link" id="sc-save-btn">Save</button>' +
            '<button class="btn-link" id="sc-cancel-btn">Cancel</button>' +
            '</div>';

        editor.innerHTML = html;
        editor.classList.add("visible");

        $("sc-mode-select").addEventListener("change", function () {
            var isOffset = this.value === "offset";
            $("sc-offset-field").style.display = isOffset ? "" : "none";
            $("sc-custom-rates").style.display = isOffset ? "none" : "";
        });

        $("sc-color-swatches").querySelectorAll(".color-swatch").forEach(function (sw) {
            sw.addEventListener("click", function () {
                $("sc-color-swatches").querySelectorAll(".color-swatch").forEach(function (s) { s.classList.remove("selected"); });
                sw.classList.add("selected");
            });
        });

        $("sc-save-btn").addEventListener("click", saveScenario);
        $("sc-cancel-btn").addEventListener("click", hideScenarioEditor);
    }

    function hideScenarioEditor() {
        $("scenario-editor").innerHTML = "";
        $("scenario-editor").classList.remove("visible");
        editingScenarioId = null;
    }

    function saveScenario() {
        var label = $("sc-label-input").value || "Scenario";
        var selectedSwatch = $("sc-color-swatches").querySelector(".color-swatch.selected");
        var color = selectedSwatch ? selectedSwatch.dataset.color : baseColor;
        var mode = $("sc-mode-select").value;
        var offset = parseFloat($("sc-offset-input").value) || 0;
        var termRates = [];
        document.querySelectorAll(".sc-custom-rate").forEach(function (inp) {
            termRates.push(parseFloat(inp.value) || 0);
        });

        if (editingScenarioId) {
            var sc = scenarios.find(function (s) { return s.id === editingScenarioId; });
            if (sc) {
                sc.label = label;
                sc.color = color;
                sc.mode = mode;
                sc.offset = offset;
                if (mode === "custom") sc.termRates = termRates;
                else delete sc.termRates;
            }
        } else {
            if (scenarios.length >= 5) return;
            var newId = "s" + Date.now();
            var newSc = { id: newId, label: label, mode: mode, offset: offset, color: color, visible: true };
            if (mode === "custom") newSc.termRates = termRates;
            scenarios.push(newSc);
        }

        hideScenarioEditor();
        renderScenarioChips();
        render();
        saveState();
    }

    function deleteScenario(id) {
        scenarios = scenarios.filter(function (s) { return s.id !== id; });
        renderScenarioChips();
        render();
        saveState();
    }

    function getNextColor() {
        var usedColors = scenarios.map(function (s) { return s.color; });
        for (var i = 0; i < scenarioPresetColors.length; i++) {
            if (usedColors.indexOf(scenarioPresetColors[i]) === -1) return scenarioPresetColors[i];
        }
        return scenarioPresetColors[scenarios.length % scenarioPresetColors.length];
    }

    function getScenarioTermDefs(scenario) {
        if (scenario.id === "base") return terms;
        if (scenario.mode === "offset") {
            return terms.map(function (t) { return { years: t.years, rate: Math.max(0, t.rate + (scenario.offset || 0)) }; });
        }
        if (scenario.mode === "custom") {
            return terms.map(function (t, i) {
                return { years: t.years, rate: (scenario.termRates && i < scenario.termRates.length) ? scenario.termRates[i] : t.rate };
            });
        }
        return terms;
    }

    $("add-scenario").addEventListener("click", function () {
        if (scenarios.length >= 5) return;
        showScenarioEditor(null);
    });

    // ===== SIMULATION =====

    function simulateMortgage(principal, amortYears, termDefs, freq, annualIncrease, lumpAnnual, lumpTerm, startMonth, startYear) {
        var balance = principal;
        var remainingAmort = amortYears;
        var totalInterest = 0;
        var totalPrincipalPaid = 0;
        var termResults = [];
        var schedule = [];
        var globalPeriod = 0;
        var compounding = countryConfig[country].compounding;
        var ppy = frequencyConfig[freq].ppy;
        var cumulativeInterest = 0;
        var annualSnapshots = [{ year: 0, balance: principal, cumulativeInterest: 0, annualPrincipal: 0, annualInterest: 0, termIndex: 0, payment: 0 }];
        var yearPrincipal = 0;
        var yearInterest = 0;
        var currentPaymentYear = 0;

        for (var ti = 0; ti < termDefs.length && balance > 0.01; ti++) {
            var term = termDefs[ti];
            var r = effectivePeriodRate(term.rate, freq, compounding);
            var termPeriods = term.years * ppy;
            var basePayment = calcPeriodicPayment(balance, term.rate, remainingAmort, freq, compounding);
            // Fix initial snapshot payment now that we know the first term's payment
            if (ti === 0) annualSnapshots[0].payment = basePayment;
            var payment = basePayment;
            var paymentsThisYear = 0;
            var termPrincipal = 0;
            var termInterest = 0;

            for (var p = 0; p < termPeriods && balance > 0.01; p++) {
                if (p > 0 && p % ppy === 0) {
                    payment += annualIncrease;
                    // Emit annual snapshot at year boundary
                    currentPaymentYear++;
                    annualSnapshots.push({
                        year: currentPaymentYear,
                        balance: Math.max(0, balance),
                        cumulativeInterest: cumulativeInterest,
                        annualPrincipal: yearPrincipal,
                        annualInterest: yearInterest,
                        termIndex: ti,
                        payment: payment,
                    });
                    yearPrincipal = 0;
                    yearInterest = 0;
                }

                var interestPortion = balance * r;
                var principalPortion = payment - interestPortion;
                if (principalPortion > balance) principalPortion = balance;

                balance -= principalPortion;
                termPrincipal += principalPortion;
                termInterest += interestPortion;
                cumulativeInterest += interestPortion;
                yearPrincipal += principalPortion;
                yearInterest += interestPortion;
                paymentsThisYear++;

                var periodInYear = globalPeriod % ppy;
                var yearFromStart = Math.floor(globalPeriod / ppy);
                var absMonth = (startMonth + Math.floor(globalPeriod * 12 / ppy)) % 12;
                var absYear = startYear + Math.floor((startMonth + globalPeriod * 12 / ppy) / 12);

                schedule.push({
                    period: globalPeriod,
                    periodInYear: periodInYear,
                    yearFromStart: yearFromStart,
                    month: absMonth,
                    year: absYear,
                    termIndex: ti,
                    payment: principalPortion + interestPortion,
                    principal: principalPortion,
                    interest: interestPortion,
                    balance: Math.max(0, balance),
                    cumulativeInterest: cumulativeInterest,
                });

                globalPeriod++;

                if (lumpAnnual > 0 && paymentsThisYear === ppy && balance > 0.01) {
                    var lumpApply = Math.min(lumpAnnual, balance);
                    balance -= lumpApply;
                    termPrincipal += lumpApply;
                }
            }

            if (lumpTerm > 0 && balance > 0.01) {
                var lumpApplyTerm = Math.min(lumpTerm, balance);
                balance -= lumpApplyTerm;
                termPrincipal += lumpApplyTerm;
            }

            totalInterest += termInterest;
            totalPrincipalPaid += termPrincipal;
            remainingAmort -= term.years;
            if (remainingAmort < 1) remainingAmort = 1;

            var remainingYears = 0;
            var remainingMonths = 0;
            if (balance > 0.01) {
                remainingYears = Math.max(0, remainingAmort);
                remainingMonths = 0;
            }

            termResults.push({
                index: ti,
                years: term.years,
                rate: term.rate,
                basePayment: basePayment,
                principalPaid: termPrincipal,
                interestPaid: termInterest,
                cumulativeInterest: cumulativeInterest,
                balanceAtEnd: balance,
                totalPayments: termPrincipal + termInterest,
                remainingYears: remainingYears,
                remainingMonths: remainingMonths,
            });
        }

        // Final annual snapshot if there is leftover year data
        if (yearPrincipal > 0 || yearInterest > 0) {
            currentPaymentYear++;
            annualSnapshots.push({
                year: currentPaymentYear,
                balance: Math.max(0, balance),
                cumulativeInterest: cumulativeInterest,
                annualPrincipal: yearPrincipal,
                annualInterest: yearInterest,
                termIndex: termResults.length > 0 ? termResults[termResults.length - 1].index : 0,
                payment: termResults.length > 0 ? termResults[termResults.length - 1].basePayment : 0,
            });
        }

        return {
            totalInterest: totalInterest,
            totalPrincipalPaid: totalPrincipalPaid,
            totalPaid: totalInterest + totalPrincipalPaid,
            termResults: termResults,
            schedule: schedule,
            annualSnapshots: annualSnapshots,
            paidOff: balance < 0.01,
            principal: principal,
            totalPeriods: globalPeriod,
        };
    }

    function simulateAllScenarios() {
        var principal = parseFloat($("loan-amount").value) || 0;
        var amort = parseInt($("amortization").value, 10) || 25;
        var annualIncrease = parseFloat($("payment-increase").value) || 0;
        var lumpAnnual = parseFloat($("lump-sum-annual").value) || 0;
        var lumpTerm = parseFloat($("lump-sum-term").value) || 0;
        var startMonth = parseInt($("start-month").value, 10) || 0;
        var startYear = parseInt($("start-year").value, 10) || 2026;

        var results = { base: null, scenarios: {} };

        // Base scenario
        results.base = simulateMortgage(principal, amort, terms, paymentFrequency, annualIncrease, lumpAnnual, lumpTerm, startMonth, startYear);

        // Non-base scenarios
        scenarios.forEach(function (sc) {
            if (sc.id === "base" || !sc.visible) return;
            var termDefs = getScenarioTermDefs(sc);
            results.scenarios[sc.id] = simulateMortgage(principal, amort, termDefs, paymentFrequency, annualIncrease, lumpAnnual, lumpTerm, startMonth, startYear);
        });

        lastSimResults = results;
        return results;
    }

    // ===== RESULTS RENDERING =====

    function render() {
        var principal = parseFloat($("loan-amount").value) || 0;
        var amort = parseInt($("amortization").value, 10) || 25;

        if (principal <= 0 || terms.length === 0) {
            $("results").classList.remove("visible");
            $("savings-cards").classList.remove("visible");
            $("charts-container").classList.remove("visible");
            $("schedule-section").style.display = "none";
            $("export-section").classList.remove("visible");
            return;
        }

        var results = simulateAllScenarios();
        var sim = results.base;

        // Update hook
        $("hook-loan").textContent = fmt(principal);
        $("hook-interest").textContent = fmt(sim.totalInterest);

        // Summary cards
        var html =
            '<div class="result-summary">' +
            '<div class="summary-card"><div class="label">Total Paid</div><div class="value">' + fmt(sim.totalPaid) + '</div></div>' +
            '<div class="summary-card"><div class="label">Total Principal</div><div class="value">' + fmt(sim.totalPrincipalPaid) + '</div></div>' +
            '<div class="summary-card"><div class="label">Total Interest</div><div class="value">' + fmt(sim.totalInterest) + '</div></div>' +
            '</div>' +
            '<div class="result-summary" style="margin-bottom:1.25rem">' +
            '<div class="summary-card accent"><div class="label">Interest / Payments</div><div class="value">' + fmtPct(sim.totalPaid > 0 ? sim.totalInterest / sim.totalPaid * 100 : 0) + '</div></div>';

        // CMHC premium card
        var hv = parseFloat($("home-value").value) || 0;
        var dp = parseFloat($("down-payment").value) || 0;
        var pct = hv > 0 ? (dp / hv * 100) : 0;
        if (country === "ca" && pct < 20 && hv > dp) {
            var cmhcPrem = calcCmhcPremium(hv - dp, pct);
            html += '<div class="summary-card" style="margin-bottom:1.25rem"><div class="label">CMHC Premium (in principal)</div><div class="value">' + fmt(cmhcPrem) + '</div></div>';
        }

        // Frequency comparison hint
        if (paymentFrequency.startsWith("accelerated_")) {
            var monthlyPmt = calcMonthlyPayment(principal, terms[0].rate, amort, countryConfig[country].compounding);
            html += '<div class="freq-compare">Accelerated ' + freqLabel().replace("Accelerated ", "").toLowerCase() + ' payments of <strong>' + fmtFull(calcPeriodicPayment(principal, terms[0].rate, amort, paymentFrequency, countryConfig[country].compounding)) + '</strong> put ~1 extra monthly payment per year toward your mortgage.</div>';
        }

        // Per-term breakdown
        sim.termResults.forEach(function (tr, i) {
            var remainingText = "";
            if (tr.balanceAtEnd > 0.01) {
                var ry = tr.remainingYears;
                var rm = tr.remainingMonths;
                remainingText = '<div class="term-remaining">' + ry + (ry === 1 ? ' yr' : ' yrs') + (rm > 0 ? ' ' + rm + (rm === 1 ? ' mo' : ' mos') : '') + ' remaining on amortization</div>';
            }
            html +=
                '<div class="term-result">' +
                '<h4>Term ' + (i + 1) + ' &mdash; ' + tr.years + ' yr @ ' + tr.rate + '% (' + freqLabel() + ')</h4>' +
                '<dl class="term-result-grid">' +
                '<div><dt>Payment</dt><dd>' + fmtFull(tr.basePayment) + freqSuffix() + '</dd></div>' +
                '<div><dt>Principal Paid</dt><dd>' + fmt(tr.principalPaid) + '</dd></div>' +
                '<div><dt>Interest Paid</dt><dd>' + fmt(tr.interestPaid) + '</dd></div>' +
                '<div><dt>Balance at End</dt><dd>' + fmt(tr.balanceAtEnd) + '</dd></div>' +
                '<div><dt>Cumulative Interest</dt><dd>' + fmt(tr.cumulativeInterest) + '</dd></div>' +
                '<div><dt>Interest Share</dt><dd>' + fmtPct(tr.totalPayments > 0 ? tr.interestPaid / tr.totalPayments * 100 : 0) + '</dd></div>' +
                '</dl>' +
                remainingText +
                '</div>';
        });

        // Scenario comparison table
        var visibleScenarios = scenarios.filter(function (s) { return s.visible && s.id !== "base"; });
        if (visibleScenarios.length > 0) {
            html += '<div class="scenario-compare"><table class="scenario-table"><thead><tr><th></th>';
            html += '<th><span class="scenario-label"><span class="chip-dot" style="background:' + baseColor + '"></span>Base</span></th>';
            visibleScenarios.forEach(function (sc) {
                html += '<th><span class="scenario-label"><span class="chip-dot" style="background:' + sc.color + '"></span>' + sc.label + '</span></th>';
            });
            html += '</tr></thead><tbody>';

            var firstTerm = sim.termResults[0];
            html += '<tr><td>' + freqLabel() + ' Payment</td><td>' + (firstTerm ? fmtFull(firstTerm.basePayment) : "-") + '</td>';
            visibleScenarios.forEach(function (sc) {
                var scSim = results.scenarios[sc.id];
                html += '<td>' + (scSim && scSim.termResults[0] ? fmtFull(scSim.termResults[0].basePayment) : "-") + '</td>';
            });
            html += '</tr>';

            html += '<tr><td>Total Interest</td><td>' + fmt(sim.totalInterest) + '</td>';
            visibleScenarios.forEach(function (sc) {
                var scSim = results.scenarios[sc.id];
                html += '<td>' + (scSim ? fmt(scSim.totalInterest) : "-") + '</td>';
            });
            html += '</tr>';

            html += '<tr><td>Total Paid</td><td>' + fmt(sim.totalPaid) + '</td>';
            visibleScenarios.forEach(function (sc) {
                var scSim = results.scenarios[sc.id];
                html += '<td>' + (scSim ? fmt(scSim.totalPaid) : "-") + '</td>';
            });
            html += '</tr>';

            html += '<tr><td>Interest Share</td><td>' + fmtPct(sim.totalPaid > 0 ? sim.totalInterest / sim.totalPaid * 100 : 0) + '</td>';
            visibleScenarios.forEach(function (sc) {
                var scSim = results.scenarios[sc.id];
                html += '<td>' + (scSim ? fmtPct(scSim.totalPaid > 0 ? scSim.totalInterest / scSim.totalPaid * 100 : 0) : "-") + '</td>';
            });
            html += '</tr>';

            html += '<tr><td>Paid Off</td><td>' + (sim.paidOff ? "Yes" : "No") + '</td>';
            visibleScenarios.forEach(function (sc) {
                var scSim = results.scenarios[sc.id];
                html += '<td>' + (scSim ? (scSim.paidOff ? "Yes" : "No") : "-") + '</td>';
            });
            html += '</tr>';

            html += '</tbody></table></div>';
        }

        // Missing years
        var totalTermYears = 0;
        terms.forEach(function (t) { totalTermYears += t.years; });
        var missingYears = amort - totalTermYears;
        if (missingYears > 0) {
            var remainingBalance = sim.paidOff ? 0 : sim.termResults[sim.termResults.length - 1].balanceAtEnd;
            html += '<div class="missing-years">' +
                'Defined terms cover <strong>' + totalTermYears + ' of ' + amort + ' years</strong> of the amortization. ' +
                '<strong>' + missingYears + ' years</strong> remain after the last term with a balance of <strong>' + fmt(remainingBalance) + '</strong>. ' +
                'You will need to renew at whatever rate is available then.' +
                '</div>';
        }

        if (!sim.paidOff) {
            html += '<p class="hint warning">Mortgage not fully paid after all terms. Remaining balance: ' + fmt(sim.termResults[sim.termResults.length - 1].balanceAtEnd) + '</p>';
        }

        $("results").innerHTML = html;
        $("results").classList.add("visible");

        // Savings cards
        renderSavingsCards(results);

        // Charts
        renderCharts(results);

        // Schedule
        renderSchedule(sim);

        // Export
        $("export-section").classList.add("visible");

        saveState();
    }

    // ===== SAVINGS CARDS =====

    function renderSavingsCards(results) {
        var sim = results.base;
        var visibleScenarios = scenarios.filter(function (s) { return s.visible && s.id !== "base"; });
        if (visibleScenarios.length === 0) {
            $("savings-cards").classList.remove("visible");
            $("savings-cards").innerHTML = "";
            return;
        }

        var html = '<div class="savings-cards-row">';
        visibleScenarios.forEach(function (sc) {
            var scSim = results.scenarios[sc.id];
            if (!scSim) return;

            var interestDelta = scSim.totalInterest - sim.totalInterest;
            var baseMonths = sim.totalPeriods;
            var scMonths = scSim.totalPeriods;
            // Convert payment periods to calendar months
            var ppy = frequencyConfig[paymentFrequency].ppy;
            var baseCalMonths = Math.round(baseMonths * 12 / ppy);
            var scCalMonths = Math.round(scMonths * 12 / ppy);
            var monthDelta = scCalMonths - baseCalMonths;
            var balanceAtFirstRenewal = sim.termResults.length > 0 ? sim.termResults[0].balanceAtEnd : 0;
            var scBalanceAtFirstRenewal = scSim.termResults.length > 0 ? scSim.termResults[0].balanceAtEnd : 0;
            var balanceDelta = scBalanceAtFirstRenewal - balanceAtFirstRenewal;

            var interestClass = interestDelta < 0 ? "negative" : "positive";
            var paidOffText = monthDelta < 0 ? Math.abs(monthDelta) + " mo early" : monthDelta > 0 ? monthDelta + " mo late" : "same";
            var balanceClass = balanceDelta < 0 ? "negative" : balanceDelta > 0 ? "positive" : "";

            html +=
                '<div class="savings-card">' +
                '<div class="savings-card-header"><span class="chip-dot" style="background:' + sc.color + '"></span>' + sc.label + '</div>' +
                '<div class="savings-card-row"><span>Total interest</span><span class="delta ' + interestClass + '">' + (interestDelta >= 0 ? "+" : "") + fmt(interestDelta) + '</span></div>' +
                '<div class="savings-card-row"><span>Paid off</span><span class="delta ' + (monthDelta <= 0 ? "negative" : "positive") + '">' + paidOffText + '</span></div>' +
                '<div class="savings-card-row"><span>Balance at first renewal</span><span class="delta ' + balanceClass + '">' + (balanceDelta >= 0 ? "+" : "") + fmt(balanceDelta) + '</span></div>' +
                '</div>';
        });
        html += '</div>';

        $("savings-cards").innerHTML = html;
        $("savings-cards").classList.add("visible");
    }

    // ===== CHARTS =====

    function renderCharts(results) {
        var container = $("charts-container");
        container.classList.add("visible");

        if (typeof Chart === "undefined") {
            container.innerHTML = "<p class='hint'>Charts require an internet connection to load Chart.js.</p>";
            return;
        }

        var sim = results.base;
        var visibleScenarios = scenarios.filter(function (s) { return s.visible; });
        var dark = isDark();
        var gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
        var textColor = dark ? "#aaa" : "#555";

        // Term boundary years for annotations
        var termBoundaries = [];
        var cumYears = 0;
        terms.forEach(function (t, i) {
            cumYears += t.years;
            termBoundaries.push({ year: cumYears, label: "T" + (i + 1), rate: t.rate });
        });

        // Chart A: Balance Over Time
        drawLineChart("balanceChart", results, visibleScenarios, "balance", "Balance Over Time", "Balance ($)", gridColor, textColor, termBoundaries);

        // Chart B: Cumulative Interest
        drawLineChart("cumulativeInterestChart", results, visibleScenarios, "cumulativeInterest", "Cumulative Interest", "Interest ($)", gridColor, textColor, termBoundaries);

        // Chart C: Payment Over Time (step chart)
        drawPaymentChart(results, visibleScenarios, gridColor, textColor, termBoundaries);

        // Chart D: Interest vs Principal split
        drawIPSplitChart(results, gridColor, textColor);

        // Interest per term bar chart
        drawInterestBarChart(sim, gridColor, textColor);
    }

    function destroyChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    function drawLineChart(canvasId, results, visibleScenarios, field, title, yLabel, gridColor, textColor, termBoundaries) {
        destroyChart(canvasId);
        var canvas = $(canvasId);
        if (!canvas) return;

        var datasets = [];
        visibleScenarios.forEach(function (sc) {
            var scSim = sc.id === "base" ? results.base : results.scenarios[sc.id];
            if (!scSim) return;
            var data = scSim.annualSnapshots.map(function (s) { return { x: s.year, y: s[field] }; });
            datasets.push({
                label: sc.label,
                data: data,
                borderColor: sc.color,
                backgroundColor: sc.color + "20",
                borderWidth: 2,
                fill: field === "balance",
                pointRadius: 0,
                tension: 0.1,
            });
        });

        var annotations = {};
        termBoundaries.forEach(function (tb, i) {
            annotations["term" + i] = {
                type: "line",
                xMin: tb.year,
                xMax: tb.year,
                borderColor: textColor,
                borderWidth: 1,
                borderDash: [4, 4],
                label: {
                    display: true,
                    content: tb.label + " (" + tb.rate + "%)",
                    position: "start",
                    font: { size: 10 },
                    backgroundColor: "transparent",
                    color: textColor,
                },
            };
        });

        // Store base scenario ID for tooltip delta calculation
        var baseId = scenarios.find(function (s) { return s.id === "base"; }) ? "base" : null;

        chartInstances[canvasId] = new Chart(canvas, {
            type: "line",
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: {
                        type: "linear",
                        title: { display: true, text: "Year", color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor, stepSize: 5 },
                    },
                    y: {
                        title: { display: true, text: yLabel, color: textColor },
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: function (v) { return v >= 1000 ? "$" + Math.round(v / 1000) + "k" : "$" + v; },
                        },
                    },
                },
                plugins: {
                    annotation: { annotations: annotations },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterBody: function (items) {
                                if (!baseId || items.length <= 1) return [];
                                var baseVal = null;
                                items.forEach(function (item) {
                                    var sc = visibleScenarios[item.datasetIndex];
                                    if (sc && sc.id === baseId) baseVal = item.parsed.y;
                                });
                                if (baseVal === null) return [];
                                var lines = [];
                                items.forEach(function (item) {
                                    var sc = visibleScenarios[item.datasetIndex];
                                    if (!sc || sc.id === baseId) return;
                                    var delta = item.parsed.y - baseVal;
                                    var sign = delta >= 0 ? "+" : "";
                                    lines.push(sc.label + " " + sign + fmt(delta) + " vs Base");
                                });
                                return lines;
                            },
                            label: function (ctx) { return ctx.dataset.label + ": " + fmt(ctx.parsed.y); },
                        },
                    },
                },
            },
        });
    }

    function drawPaymentChart(results, visibleScenarios, gridColor, textColor, termBoundaries) {
        destroyChart("paymentChart");
        var canvas = $("paymentChart");
        if (!canvas) return;

        var datasets = [];
        visibleScenarios.forEach(function (sc) {
            var scSim = sc.id === "base" ? results.base : results.scenarios[sc.id];
            if (!scSim) return;
            var data = [];
            scSim.annualSnapshots.forEach(function (s) {
                if (s.year > 0) data.push({ x: s.year, y: s.payment });
            });
            datasets.push({
                label: sc.label,
                data: data,
                borderColor: sc.color,
                backgroundColor: sc.color + "20",
                borderWidth: 2,
                stepped: "before",
                fill: false,
                pointRadius: 0,
            });
        });

        var annotations = {};
        termBoundaries.forEach(function (tb, i) {
            annotations["term" + i] = {
                type: "line",
                xMin: tb.year,
                xMax: tb.year,
                borderColor: textColor,
                borderWidth: 1,
                borderDash: [4, 4],
                label: {
                    display: true,
                    content: tb.label + " (" + tb.rate + "%)",
                    position: "start",
                    font: { size: 10 },
                    backgroundColor: "transparent",
                    color: textColor,
                },
            };
        });

        var baseId = scenarios.find(function (s) { return s.id === "base"; }) ? "base" : null;

        chartInstances["paymentChart"] = new Chart(canvas, {
            type: "line",
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: {
                        type: "linear",
                        title: { display: true, text: "Year", color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor, stepSize: 5 },
                    },
                    y: {
                        title: { display: true, text: "Payment (" + freqSuffix().replace("/", "").trim() + ")", color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor, callback: function (v) { return fmt(v); } },
                    },
                },
                plugins: {
                    annotation: { annotations: annotations },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterBody: function (items) {
                                if (!baseId || items.length <= 1) return [];
                                var baseVal = null;
                                items.forEach(function (item) {
                                    var sc = visibleScenarios[item.datasetIndex];
                                    if (sc && sc.id === baseId) baseVal = item.parsed.y;
                                });
                                if (baseVal === null) return [];
                                var lines = [];
                                items.forEach(function (item) {
                                    var sc = visibleScenarios[item.datasetIndex];
                                    if (!sc || sc.id === baseId) return;
                                    var delta = item.parsed.y - baseVal;
                                    var sign = delta >= 0 ? "+" : "";
                                    lines.push(sc.label + " " + sign + fmtFull(delta) + " vs Base");
                                });
                                return lines;
                            },
                            label: function (ctx) { return ctx.dataset.label + ": " + fmtFull(ctx.parsed.y) + freqSuffix(); },
                        },
                    },
                },
            },
        });
    }

    function drawIPSplitChart(results, gridColor, textColor) {
        destroyChart("ipSplitChart");
        var canvas = $("ipSplitChart");
        if (!canvas) return;

        // Populate scenario selector
        var select = $("ip-scenario-select");
        select.innerHTML = "";
        scenarios.forEach(function (sc) {
            if (!sc.visible) return;
            var opt = document.createElement("option");
            opt.value = sc.id;
            opt.textContent = sc.label;
            select.appendChild(opt);
        });

        var selectedId = select.value || "base";
        var sim = selectedId === "base" ? results.base : results.scenarios[selectedId];
        if (!sim) return;

        var snapshots = sim.annualSnapshots.filter(function (s) { return s.year > 0; });
        var labels = snapshots.map(function (s) { return s.year; });

        chartInstances["ipSplitChart"] = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Principal",
                        data: snapshots.map(function (s) { return s.annualPrincipal; }),
                        backgroundColor: isDark() ? "rgba(176,176,176,0.5)" : "rgba(74,74,74,0.5)",
                        borderColor: isDark() ? "#b0b0b0" : "#4a4a4a",
                        borderWidth: 1,
                        fill: true,
                    },
                    {
                        label: "Interest",
                        data: snapshots.map(function (s) { return s.annualInterest; }),
                        backgroundColor: isDark() ? "rgba(102,102,102,0.5)" : "rgba(197,197,197,0.5)",
                        borderColor: isDark() ? "#666" : "#c5c5c5",
                        borderWidth: 1,
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: { display: true, text: "Year", color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                    },
                    y: {
                        stacked: true,
                        title: { display: true, text: "Dollars", color: textColor },
                        grid: { color: gridColor },
                        ticks: { color: textColor, callback: function (v) { return v >= 1000 ? "$" + Math.round(v / 1000) + "k" : "$" + v; } },
                    },
                },
                plugins: {
                    legend: { display: true, labels: { color: textColor, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) { return ctx.dataset.label + ": " + fmt(ctx.parsed.y); },
                        },
                    },
                },
            },
        });

        select.onchange = function () {
            drawIPSplitChart(results, gridColor, textColor);
        };
    }

    function drawInterestBarChart(sim, gridColor, textColor) {
        destroyChart("interestBarChart");
        var canvas = $("interestBarChart");
        if (!canvas) return;

        var tr = sim.termResults;
        if (tr.length === 0) return;

        var tc = getTermColors();
        chartInstances["interestBarChart"] = new Chart(canvas, {
            type: "bar",
            data: {
                labels: tr.map(function (t, i) { return "Term " + (i + 1); }),
                datasets: [{
                    label: "Interest Paid",
                    data: tr.map(function (t) { return t.interestPaid; }),
                    backgroundColor: tr.map(function (t, i) { return tc[i % tc.length]; }),
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor } },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, callback: function (v) { return fmt(v); } },
                        title: { display: true, text: "Interest Paid", color: textColor },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function (items) {
                                var i = items[0].dataIndex;
                                return "Term " + (i + 1) + " &mdash; " + tr[i].years + "yr @ " + tr[i].rate + "%";
                            },
                            label: function (ctx) { return fmt(ctx.parsed.y); },
                        },
                    },
                },
            },
        });
    }

    // ===== CHART TABS =====

    $("charts-container").querySelectorAll(".chart-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            $("charts-container").querySelectorAll(".chart-tab").forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            $("charts-container").querySelectorAll(".chart-panel").forEach(function (p) { p.classList.remove("visible"); });
            var panel = $("panel-" + tab.dataset.chart);
            if (panel) panel.classList.add("visible");
        });
    });

    // ===== AMORTIZATION SCHEDULE =====

    function renderSchedule(sim) {
        $("schedule-section").style.display = "block";
        var rows = sim.schedule;
        var ppy = frequencyConfig[paymentFrequency].ppy;
        var startYear = parseInt($("start-year").value, 10) || 2026;

        if (scheduleMode === "annual") {
            var byYear = {};
            rows.forEach(function (r) {
                var key = r.yearFromStart;
                if (!byYear[key]) byYear[key] = { yearFromStart: key, year: r.year, termIndex: r.termIndex, payment: 0, principal: 0, interest: 0, balance: 0 };
                byYear[key].payment += r.payment;
                byYear[key].principal += r.principal;
                byYear[key].interest += r.interest;
                byYear[key].balance = r.balance;
            });
            var yearRows = Object.keys(byYear).sort(function (a, b) { return a - b; }).map(function (k) { return byYear[k]; });

            $("schedule-table").querySelector("thead").innerHTML =
                "<tr><th>Year</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>";

            var html = "";
            var prevTerm = yearRows.length > 0 ? yearRows[0].termIndex : -1;
            yearRows.forEach(function (r) {
                var cls = r.termIndex !== prevTerm ? ' class="term-boundary"' : "";
                prevTerm = r.termIndex;
                html += "<tr" + cls + ">" +
                    "<td>" + r.year + "</td>" +
                    "<td>" + fmt(r.payment) + "</td>" +
                    "<td>" + fmt(r.principal) + "</td>" +
                    "<td>" + fmt(r.interest) + "</td>" +
                    "<td>" + fmt(r.balance) + "</td>" +
                    "</tr>";
            });
            $("schedule-table").querySelector("tbody").innerHTML = html;
        } else {
            // Detail view
            $("schedule-table").querySelector("thead").innerHTML =
                "<tr><th>Period</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>";

            var html = "";
            var prevTerm = rows.length > 0 ? rows[0].termIndex : -1;
            rows.forEach(function (r) {
                var cls = r.termIndex !== prevTerm ? ' class="term-boundary"' : "";
                prevTerm = r.termIndex;
                var label = paymentFrequency === "monthly"
                    ? monthNames[r.month] + " " + r.year
                    : "Y" + (r.yearFromStart + 1) + " P" + (r.periodInYear + 1);
                html += "<tr" + cls + ">" +
                    "<td>" + label + "</td>" +
                    "<td>" + fmt(r.payment) + "</td>" +
                    "<td>" + fmt(r.principal) + "</td>" +
                    "<td>" + fmt(r.interest) + "</td>" +
                    "<td>" + fmt(r.balance) + "</td>" +
                    "</tr>";
            });
            $("schedule-table").querySelector("tbody").innerHTML = html;
        }
    }

    $("btn-detail").addEventListener("click", function () {
        scheduleMode = "detail";
        $("btn-detail").classList.add("active");
        $("btn-annual").classList.remove("active");
        if (lastSimResults) renderSchedule(lastSimResults.base);
    });

    $("btn-annual").addEventListener("click", function () {
        scheduleMode = "annual";
        $("btn-annual").classList.add("active");
        $("btn-detail").classList.remove("active");
        if (lastSimResults) renderSchedule(lastSimResults.base);
    });

    // ===== EXPORT/SHARE =====

    function base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function base64Decode(str) {
        try { return decodeURIComponent(escape(atob(str))); } catch (e) { return null; }
    }

    $("btn-share").addEventListener("click", function () {
        try {
            var state = {
                c: country,
                hv: $("home-value").value,
                dp: $("down-payment").value,
                am: $("amortization").value,
                pi: $("payment-increase").value,
                la: $("lump-sum-annual").value,
                lt: $("lump-sum-term").value,
                pf: paymentFrequency,
                ftb: firstTimeBuyer,
                nb: newBuild,
                t: terms,
                sc: scenarios.filter(function (s) { return s.id !== "base"; }),
            };
            var encoded = base64Encode(JSON.stringify(state));
            var url = window.location.pathname + "?s=" + encodeURIComponent(encoded);
            navigator.clipboard.writeText(window.location.origin + url).then(function () {
                $("btn-share").textContent = "Copied!";
                setTimeout(function () { $("btn-share").textContent = "Copy shareable link"; }, 2000);
            });
        } catch (e) {}
    });

    $("btn-csv").addEventListener("click", function () {
        if (!lastSimResults) return;
        var lines = ["Year,Month,Scenario,Payment,Principal,Interest,Balance"];

        function addScenarioRows(label, sim) {
            sim.schedule.forEach(function (r) {
                lines.push(
                    r.year + "," +
                    (r.month + 1) + "," +
                    '"' + label + '",' +
                    r.payment.toFixed(2) + "," +
                    r.principal.toFixed(2) + "," +
                    r.interest.toFixed(2) + "," +
                    r.balance.toFixed(2)
                );
            });
        }

        addScenarioRows("Base", lastSimResults.base);
        Object.keys(lastSimResults.scenarios).forEach(function (id) {
            var sc = scenarios.find(function (s) { return s.id === id; });
            if (sc) addScenarioRows(sc.label, lastSimResults.scenarios[id]);
        });

        var csv = lines.join("\n");
        var blob = new Blob([csv], { type: "text/csv" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "mortgage-amortization.csv";
        a.click();
        URL.revokeObjectURL(url);
    });

    $("btn-png").addEventListener("click", function () {
        // Export the currently visible chart panel as PNG
        var panels = ["balance", "cumulative", "payment", "ip"];
        var visibleCanvas = null;
        for (var i = 0; i < panels.length; i++) {
            var panel = $("panel-" + panels[i]);
            if (panel && panel.classList.contains("visible")) {
                visibleCanvas = panel.querySelector("canvas");
                break;
            }
        }
        if (!visibleCanvas) return;
        var chartInstance = Chart.getChart(visibleCanvas);
        if (!chartInstance) return;
        var dataUrl = chartInstance.toBase64Image("image/png", 1);
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = "mortgage-chart.png";
        a.click();
    });

    // ===== URL STATE =====

    function loadUrlState() {
        try {
            var params = new URLSearchParams(window.location.search);
            var encoded = params.get("s");
            if (!encoded) return null;
            var json = base64Decode(decodeURIComponent(encoded));
            if (!json) return null;
            var state = JSON.parse(json);
            return {
                v: 2,
                country: state.c || "ca",
                homeValue: state.hv,
                downPayment: state.dp,
                amortization: state.am,
                paymentIncrease: state.pi,
                lumpSumAnnual: state.la,
                lumpSumTerm: state.lt,
                paymentFrequency: state.pf || "monthly",
                firstTimeBuyer: !!state.ftb,
                newBuild: !!state.nb,
                terms: state.t || [],
                scenarios: [{ id: "base", label: "Base", locked: true, color: baseColor, visible: true }].concat(
                    (state.sc || []).map(function (s, i) {
                        s.visible = true;
                        return s;
                    })
                ),
            };
        } catch (e) { return null; }
    }

    // ===== EVENT BINDINGS =====

    [$("amortization"), $("payment-increase"), $("lump-sum-annual"), $("lump-sum-term"), $("start-year")].forEach(function (el) {
        el.addEventListener("input", function () { syncLoan(); render(); });
    });

    $("payment-frequency").addEventListener("change", function () {
        paymentFrequency = this.value;
        render();
    });

    $("first-time-buyer").addEventListener("change", function () {
        firstTimeBuyer = this.checked;
        syncLoan();
        render();
    });

    $("new-build").addEventListener("change", function () {
        newBuild = this.checked;
        syncLoan();
        render();
    });

    $("start-month").addEventListener("change", render);

    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { if (lastSimResults) render(); }, 150);
    });

    // Re-render charts when theme changes
    new MutationObserver(function () {
        if (lastSimResults) render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // ===== INIT =====

    var urlState = loadUrlState();
    var saved = loadState();
    var migrated = migrateState(saved);

    if (urlState) {
        applyState(urlState);
    } else if (migrated && applyState(migrated)) {
        // Restored
    } else {
        terms = countryConfig.ca.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate }; });
        initScenarios();
    }

    // Ensure base scenario exists
    if (!scenarios.find(function (s) { return s.id === "base"; })) {
        scenarios.unshift({ id: "base", label: "Base", locked: true, color: baseColor, visible: true });
    }

    $("payment-frequency").value = paymentFrequency;
    $("first-time-buyer").checked = firstTimeBuyer;
    $("new-build").checked = newBuild;

    syncLoan();
    renderTerms();
    renderScenarioChips();
    renderCountryInfo();
    loadCollapsedState();
    render();

    // Clear button
    $("btn-clear").addEventListener("click", function () {
        clearState();
        country = "ca";
        $("btn-ca").classList.add("active");
        $("btn-us").classList.remove("active");
        var cfg = countryConfig.ca;
        $("amortization").max = cfg.maxAmort;

        $("home-value").value = 500000;
        $("down-payment").value = 100000;
        $("amortization").value = cfg.defaultAmort;
        $("payment-increase").value = 0;
        $("lump-sum-annual").value = 0;
        $("lump-sum-term").value = 0;
        $("start-month").value = 5;
        $("start-year").value = 2026;
        $("payment-frequency").value = "monthly";
        paymentFrequency = "monthly";
        firstTimeBuyer = false;
        newBuild = false;
        $("first-time-buyer").checked = false;
        $("new-build").checked = false;

        terms = cfg.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate }; });
        initScenarios();

        Object.keys(collapsibles).forEach(function (key) {
            collapsibles[key].body.classList.add("collapsed");
            collapsibles[key].arrow.classList.remove("open");
        });

        renderTerms();
        renderScenarioChips();
        syncLoan();
        renderCountryInfo();
        render();
    });
})();
