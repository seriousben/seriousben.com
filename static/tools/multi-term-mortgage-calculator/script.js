(function () {
    // --- DOM refs ---
    var homeValueInput = document.getElementById("home-value");
    var downPaymentInput = document.getElementById("down-payment");
    var loanAmountInput = document.getElementById("loan-amount");
    var downPctEl = document.getElementById("down-pct");
    var amortInput = document.getElementById("amortization");
    var paymentIncreaseInput = document.getElementById("payment-increase");
    var lumpSumAnnualInput = document.getElementById("lump-sum-annual");
    var lumpSumTermInput = document.getElementById("lump-sum-term");
    var propertyTaxInput = document.getElementById("property-tax");
    var homeInsuranceInput = document.getElementById("home-insurance");
    var hoaInput = document.getElementById("hoa");
    var pmiInput = document.getElementById("pmi");
    var pmiRow = document.getElementById("pmi-row");
    var pmiHint = document.getElementById("pmi-hint");
    var pmiLabel = document.getElementById("pmi-label");
    var hoaLabel = document.getElementById("hoa-label");
    var propertyTaxLabel = document.getElementById("property-tax-label");
    var startMonthInput = document.getElementById("start-month");
    var startYearInput = document.getElementById("start-year");
    var termsList = document.getElementById("terms-list");
    var addTermBtn = document.getElementById("add-term");
    var resultsEl = document.getElementById("results");
    var chartSection = document.getElementById("chart-section");
    var pieSection = document.getElementById("pie-section");
    var scheduleSection = document.getElementById("schedule-section");
    var scheduleTableBody = document.querySelector("#schedule-table tbody");
    var scheduleTableHead = document.querySelector("#schedule-table thead");
    var btnMonthly = document.getElementById("btn-monthly");
    var btnAnnual = document.getElementById("btn-annual");
    var btnCA = document.getElementById("btn-ca");
    var btnUS = document.getElementById("btn-us");
    var countryInfoEl = document.getElementById("country-info");
    var btnClear = document.getElementById("btn-clear");
    var hookLoan = document.getElementById("hook-loan");
    var hookInterest = document.getElementById("hook-interest");
    var rateOptimisticInput = document.getElementById("rate-optimistic");
    var ratePessimisticInput = document.getElementById("rate-pessimistic");

    // Collapsible sections
    var collapsibles = {
        prepay: { toggle: document.getElementById("toggle-prepay"), body: document.getElementById("body-prepay"), arrow: document.getElementById("arrow-prepay") },
        costs:  { toggle: document.getElementById("toggle-costs"),  body: document.getElementById("body-costs"),  arrow: document.getElementById("arrow-costs") },
        scenarios: { toggle: document.getElementById("toggle-scenarios"), body: document.getElementById("body-scenarios"), arrow: document.getElementById("arrow-scenarios") },
        date:   { toggle: document.getElementById("toggle-date"),   body: document.getElementById("body-date"),   arrow: document.getElementById("arrow-date") },
    };

    // Collapsible toggle handlers
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
            localStorage.setItem(LS_KEY + "-collapsed", JSON.stringify(state));
        } catch (e) {}
    }

    function loadCollapsedState() {
        try {
            var raw = localStorage.getItem(LS_KEY + "-collapsed");
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

    var countryInfo = {
        ca: {
            bullets: [
                "<strong>Semi-annual compounding.</strong> Interest compounds twice a year, so the effective monthly rate is lower than rate/12.",
                "<strong>CMHC default insurance</strong> required when down payment is under 20%. Premium is a one-time cost (0.6% to 4% of loan) added to the mortgage.",
                "<strong>Term vs amortization.</strong> Typical terms are 1-5 years at a fixed rate; the amortization is 25-30 years. Rate renegotiated at each renewal.",
                "<strong>Prepayment limits.</strong> Most lenders allow 10-20% lump sum per year and payment increases up to double. Penalties apply beyond that.",
            ],
        },
        us: {
            bullets: [
                "<strong>Monthly compounding.</strong> Interest is calculated at rate/12 each month. The quoted rate equals the effective rate.",
                "<strong>PMI</strong> required when down payment is under 20%. Ongoing monthly cost that cancels automatically at 78-80% LTV.",
                "<strong>30-year fixed</strong> is the most common mortgage. You lock the rate for the entire loan. No renewals.",
                "<strong>HOA</strong> (Homeowners Association) fees are common for condos and planned communities. Typically paid monthly.",
            ],
        },
    };

    var termColors = ["#111", "#4a4a4a", "#7a7a7a", "#a5a5a5", "#c5c5c5", "#333", "#5a5a5a", "#8a8a8a"];
    var pieColors = ["#111", "#4a4a4a", "#7a7a7a", "#a5a5a5", "#c5c5c5", "#ddd"];
    var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // --- Country presets ---
    var countryConfig = {
        ca: {
            defaultAmort: 25,
            maxAmort: 30,
            defaultTerms: [
                { years: 5, rate: 4.99, schedule: "monthly" },
                { years: 5, rate: 4.49, schedule: "monthly" },
                { years: 5, rate: 4.19, schedule: "monthly" },
                { years: 5, rate: 3.99, schedule: "monthly" },
                { years: 5, rate: 3.79, schedule: "monthly" },
            ],
            compounding: "semi-annual", // Canadian fixed mortgages compound semi-annually
            insuranceLabel: "Default Insurance (CMHC)",
            hoaLabel: "Condo Fees / Month",
            taxLabel: "Property Tax / Year",
            newTermDuration: 5,
            pmiEstimate: function (downPct) {
                // CMHC rates: 4% for 5-9.99%, 3.1% for 10-14.99%, 2.4% for 15-19.99%
                if (downPct < 5) return 4.0;
                if (downPct < 10) return 3.1;
                if (downPct < 15) return 2.4;
                if (downPct < 20) return 1.8;
                return 0;
            },
            pmiIsUpfront: true, // CMHC is a one-time premium added to loan
        },
        us: {
            defaultAmort: 30,
            maxAmort: 40,
            defaultTerms: [
                { years: 30, rate: 6.5, schedule: "monthly" },
            ],
            compounding: "monthly",
            insuranceLabel: "PMI",
            hoaLabel: "HOA / Month",
            taxLabel: "Property Tax / Year",
            newTermDuration: 5,
            pmiEstimate: function (downPct) {
                if (downPct < 5) return 1.5;
                if (downPct < 10) return 1.0;
                if (downPct < 15) return 0.6;
                if (downPct < 20) return 0.3;
                return 0;
            },
            pmiIsUpfront: false, // PMI is ongoing monthly
        },
    };

    var country = "ca";
    var terms = [];
    var scheduleMode = "annual";
    var lastSimResult = null;
    var LS_KEY = "mortgage-calc-v1";

    // --- Helpers ---

    function schedulePaymentsPerYear(schedule) {
        if (schedule === "biweekly") return 26;
        if (schedule === "weekly") return 52;
        return 12;
    }

    function scheduleLabel(schedule) {
        if (schedule === "biweekly") return "bi-weekly";
        if (schedule === "weekly") return "weekly";
        return "monthly";
    }

    function calcBasePayment(principal, annualRate, amortYears, schedule, compounding) {
        var ppy = schedulePaymentsPerYear(schedule);
        var n = amortYears * ppy;
        if (principal <= 0 || n <= 0) return 0;

        var r = effectivePeriodRate(annualRate, schedule, compounding);

        if (r === 0) return principal / n;
        return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    function effectivePeriodRate(annualRate, schedule, compounding) {
        if (compounding === "semi-annual") {
            // Canadian: semi-annual compounding
            // Semi rate = annualRate/2, then derive period rate from half-year
            // Monthly: 6 periods per half-year → (1+semiRate)^(1/6) - 1
            // Bi-weekly: 13 periods per half-year → (1+semiRate)^(1/13) - 1
            // Weekly: 26 periods per half-year → (1+semiRate)^(1/26) - 1
            var semiRate = annualRate / 100 / 2;
            var periodsPerHalfYear = schedule === "monthly" ? 6 : schedule === "biweekly" ? 13 : 26;
            return Math.pow(1 + semiRate, 1 / periodsPerHalfYear) - 1;
        }
        // US: monthly compounding
        return annualRate / 100 / schedulePaymentsPerYear(schedule);
    }

    function addCommas(n) {
        var parts = n.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    function fmt(val) {
        return "$" + addCommas(Math.round(val));
    }

    function fmtFull(val) {
        var rounded = Math.round(val * 100) / 100;
        var parts = rounded.toFixed(2).split(".");
        return "$" + addCommas(parseInt(parts[0])) + "." + parts[1];
    }

    function fmtPct(val) {
        return val.toFixed(1) + "%";
    }

    // --- Local storage ---

    function saveState() {
        try {
            var state = {
                country: country,
                homeValue: homeValueInput.value,
                downPayment: downPaymentInput.value,
                amortization: amortInput.value,
                paymentIncrease: paymentIncreaseInput.value,
                lumpSumAnnual: lumpSumAnnualInput.value,
                lumpSumTerm: lumpSumTermInput.value,
                propertyTax: propertyTaxInput.value,
                homeInsurance: homeInsuranceInput.value,
                hoa: hoaInput.value,
                pmi: pmiInput.value,
                startMonth: startMonthInput.value,
                startYear: startYearInput.value,
                scheduleMode: scheduleMode,
                rateOptimistic: rateOptimisticInput.value,
                ratePessimistic: ratePessimisticInput.value,
                terms: terms,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(state));
        } catch (e) { /* storage full or unavailable */ }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }

    function clearState() {
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
    }

    function applyState(s) {
        if (!s) return false;
        if (s.country && countryConfig[s.country]) {
            country = s.country;
            btnCA.classList.toggle("active", country === "ca");
            btnUS.classList.toggle("active", country === "us");
            var cfg = countryConfig[country];
            pmiLabel.textContent = cfg.insuranceLabel;
            hoaLabel.textContent = cfg.hoaLabel;
            propertyTaxLabel.textContent = cfg.taxLabel;
            amortInput.max = cfg.maxAmort;
        }
        if (s.homeValue !== undefined) homeValueInput.value = s.homeValue;
        if (s.downPayment !== undefined) downPaymentInput.value = s.downPayment;
        if (s.amortization !== undefined) amortInput.value = s.amortization;
        if (s.paymentIncrease !== undefined) paymentIncreaseInput.value = s.paymentIncrease;
        if (s.lumpSumAnnual !== undefined) lumpSumAnnualInput.value = s.lumpSumAnnual;
        if (s.lumpSumTerm !== undefined) lumpSumTermInput.value = s.lumpSumTerm;
        if (s.propertyTax !== undefined) propertyTaxInput.value = s.propertyTax;
        if (s.homeInsurance !== undefined) homeInsuranceInput.value = s.homeInsurance;
        if (s.hoa !== undefined) hoaInput.value = s.hoa;
        if (s.pmi !== undefined) pmiInput.value = s.pmi;
        if (s.startMonth !== undefined) startMonthInput.value = s.startMonth;
        if (s.startYear !== undefined) startYearInput.value = s.startYear;
        if (s.scheduleMode !== undefined) {
            scheduleMode = s.scheduleMode;
            btnMonthly.classList.toggle("active", scheduleMode === "monthly");
            btnAnnual.classList.toggle("active", scheduleMode === "annual");
        }
        if (s.rateOptimistic !== undefined) rateOptimisticInput.value = s.rateOptimistic;
        if (s.ratePessimistic !== undefined) ratePessimisticInput.value = s.ratePessimistic;
        if (s.terms && Array.isArray(s.terms) && s.terms.length > 0) {
            terms = s.terms;
        }
        renderCountryInfo();
        return true;
    }

    function renderCountryInfo() {
        var info = countryInfo[country];
        if (!info) { countryInfoEl.innerHTML = ""; return; }
        var html = "<ul>";
        info.bullets.forEach(function (b) { html += "<li>" + b + "</li>"; });
        html += "</ul>";
        countryInfoEl.innerHTML = html;
    }

    // --- Country switching ---

    function switchCountry(c) {
        country = c;
        btnCA.classList.toggle("active", c === "ca");
        btnUS.classList.toggle("active", c === "us");

        var cfg = countryConfig[country];

        // Update labels
        pmiLabel.textContent = cfg.insuranceLabel;
        hoaLabel.textContent = cfg.hoaLabel;
        propertyTaxLabel.textContent = cfg.taxLabel;

        // Update amortization
        amortInput.max = cfg.maxAmort;
        amortInput.value = cfg.defaultAmort;

        // Reset terms to country defaults
        terms = cfg.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate, schedule: t.schedule }; });

        // Reset PMI — syncLoan will re-estimate based on new country
        pmiInput.value = 0;

        // Set country-specific defaults for recurring costs
        if (c === "ca") {
            propertyTaxInput.value = 3500;
            homeInsuranceInput.value = 1200;
            hoaInput.value = 0;
        } else {
            propertyTaxInput.value = 5500;
            homeInsuranceInput.value = 2000;
            hoaInput.value = 0;
        }

        renderTerms();
        syncLoan();
        render();
        renderCountryInfo();

        // Auto-expand recurring costs if insurance is relevant
        var downPct = (parseFloat(homeValueInput.value) || 0) > 0
            ? (parseFloat(downPaymentInput.value) || 0) / (parseFloat(homeValueInput.value) || 0) * 100
            : 100;
        if (downPct < 20) {
            collapsibles.costs.body.classList.remove("collapsed");
            collapsibles.costs.arrow.classList.add("open");
        }

        saveState();
    }

    btnCA.addEventListener("click", function () { switchCountry("ca"); });
    btnUS.addEventListener("click", function () { switchCountry("us"); });

    // --- Down payment / loan amount sync ---

    function syncLoan() {
        var hv = parseFloat(homeValueInput.value) || 0;
        var dp = parseFloat(downPaymentInput.value) || 0;
        if (dp > hv) {
            dp = hv;
            downPaymentInput.value = dp;
        }
        var loan = hv - dp;
        var cfg = countryConfig[country];

        // Canada: CMHC premium added to loan if down payment < 20%
        var cmhcPremium = 0;
        if (country === "ca" && loan > 0) {
            var downPct = hv > 0 ? dp / hv * 100 : 0;
            if (downPct < 20) {
                var cmhcRate = cfg.pmiEstimate(downPct);
                cmhcPremium = loan * cmhcRate / 100;
                // CMHC premium can be added to the mortgage
                loan += cmhcPremium;
            }
        }

        loanAmountInput.value = Math.round(loan);
        var pct = hv > 0 ? (dp / hv * 100) : 0;
        downPctEl.textContent = pct.toFixed(0) + "%";

        // Insurance visibility
        if (pct < 20 && (hv - dp) > 0) {
            pmiRow.style.display = "block";
            if (country === "ca") {
                if (parseFloat(pmiInput.value) === 0) {
                    pmiInput.value = cfg.pmiEstimate(pct);
                }
                pmiHint.textContent = "CMHC premium of " + fmt(cmhcPremium) + " added to loan. Down payment under 20% requires default insurance.";
            } else {
                if (parseFloat(pmiInput.value) === 0) {
                    pmiInput.value = cfg.pmiEstimate(pct);
                }
                pmiHint.textContent = "Down payment under 20%: PMI typically required until 78-80% LTV. Adjust rate as needed.";
            }
        } else {
            pmiRow.style.display = "none";
            pmiHint.textContent = "";
        }
    }

    homeValueInput.addEventListener("input", syncLoan);
    downPaymentInput.addEventListener("input", syncLoan);

    // --- Term UI ---

    function renderTerms() {
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
                '<div class="field"><label>Schedule</label><select data-idx="' + i + '" data-field="schedule"><option value="monthly"' + (term.schedule === "monthly" ? " selected" : "") + '>Monthly</option><option value="biweekly"' + (term.schedule === "biweekly" ? " selected" : "") + '>Bi-weekly</option><option value="weekly"' + (term.schedule === "weekly" ? " selected" : "") + '>Weekly</option></select></div>' +
                '</div>';
            termsList.appendChild(card);
        });

        termsList.querySelectorAll("input, select").forEach(function (el) {
            el.addEventListener("input", function () {
                var idx = parseInt(el.dataset.idx, 10);
                var field = el.dataset.field;
                if (field === "schedule") {
                    terms[idx][field] = el.value;
                } else {
                    terms[idx][field] = parseFloat(el.value) || 0;
                }
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

    addTermBtn.addEventListener("click", function () {
        var cfg = countryConfig[country];
        var lastRate = terms.length > 0 ? terms[terms.length - 1].rate : 5;
        terms.push({ years: cfg.newTermDuration, rate: Math.max(0.5, lastRate - 0.2), schedule: "monthly" });
        renderTerms();
        render();
    });

    // --- Simulation ---

    function simulateMortgage(principal, amortYears, termDefs, annualIncrease, lumpAnnual, lumpTerm, annualTax, annualInsurance, monthlyHOA, annualPMI, startMonth, startYear) {
        var balance = principal;
        var remainingAmort = amortYears;
        var totalInterest = 0;
        var totalPrincipalPaid = 0;
        var totalTax = 0;
        var totalInsurance = 0;
        var totalHOA = 0;
        var totalPMI = 0;
        var termResults = [];
        var schedule = [];
        var currentYear = 0;
        var globalMonth = 0;
        var compounding = countryConfig[country].compounding;
        var pmiIsOngoing = country === "us"; // US: ongoing PMI, CA: upfront CMHC (already in loan)

        for (var ti = 0; ti < termDefs.length && balance > 0.01; ti++) {
            var term = termDefs[ti];
            var ppy = schedulePaymentsPerYear(term.schedule);

            var r = effectivePeriodRate(term.rate, term.schedule, compounding);

            var termPayments = term.years * ppy;

            var basePayment = calcBasePayment(balance, term.rate, remainingAmort, term.schedule, compounding);
            var payment = basePayment;
            var yearInMortgage = currentYear;
            var paymentsThisYear = 0;
            var termPrincipal = 0;
            var termInterest = 0;
            var termTax = 0;
            var termInsurance = 0;
            var termHOA = 0;
            var termPMI = 0;

            for (var p = 0; p < termPayments && balance > 0.01; p++) {
                // Annual payment increase
                if (p > 0 && p % ppy === 0) {
                    payment += annualIncrease;
                    yearInMortgage++;
                    paymentsThisYear = 0;
                }

                var interestPortion = balance * r;
                var principalPortion = payment - interestPortion;
                if (principalPortion > balance) {
                    principalPortion = balance;
                }

                // PMI (US only: ongoing until 78-80% LTV)
                var pmiPortion = 0;
                if (pmiIsOngoing) {
                    var downPct = principal > 0 ? ((parseFloat(homeValueInput.value) - balance) / parseFloat(homeValueInput.value) * 100) : 100;
                    if (downPct < 20) {
                        pmiPortion = (annualPMI / 100 * balance) / ppy;
                    }
                }

                balance -= principalPortion;
                termPrincipal += principalPortion;
                termInterest += interestPortion;
                termPMI += pmiPortion;

                paymentsThisYear++;

                // Schedule row
                var absMonth = (startMonth + globalMonth) % 12;
                var absYear = startYear + Math.floor((startMonth + globalMonth) / 12);
                schedule.push({
                    month: absMonth,
                    year: absYear,
                    termIndex: ti,
                    payment: principalPortion + interestPortion + pmiPortion,
                    principal: principalPortion,
                    interest: interestPortion,
                    pmi: pmiPortion,
                    tax: annualTax / ppy,
                    insurance: annualInsurance / ppy,
                    hoa: monthlyHOA * 12 / ppy,
                    balance: Math.max(0, balance),
                });

                globalMonth++;

                // Annual lump sum
                if (lumpAnnual > 0 && paymentsThisYear === ppy && balance > 0.01) {
                    var lumpApply = Math.min(lumpAnnual, balance);
                    balance -= lumpApply;
                    termPrincipal += lumpApply;
                }
            }

            // Lump sum at renewal
            if (lumpTerm > 0 && balance > 0.01) {
                var lumpApplyTerm = Math.min(lumpTerm, balance);
                balance -= lumpApplyTerm;
                termPrincipal += lumpApplyTerm;
            }

            var termYears = term.years;
            termTax = annualTax * termYears;
            termInsurance = annualInsurance * termYears;
            termHOA = monthlyHOA * 12 * termYears;

            totalInterest += termInterest;
            totalPrincipalPaid += termPrincipal;
            totalTax += termTax;
            totalInsurance += termInsurance;
            totalHOA += termHOA;
            totalPMI += termPMI;

            remainingAmort -= term.years;
            if (remainingAmort < 1) remainingAmort = 1;

            var insuranceLabel = country === "ca" ? "CMHC" : "PMI";

            termResults.push({
                index: ti,
                years: term.years,
                rate: term.rate,
                schedule: term.schedule,
                basePayment: basePayment,
                principalPaid: termPrincipal,
                interestPaid: termInterest,
                balanceAtEnd: balance,
                totalPayments: termPrincipal + termInterest,
                tax: termTax,
                insurance: termInsurance,
                hoa: termHOA,
                pmi: termPMI,
                pmiLabel: insuranceLabel,
            });

            currentYear += term.years;
        }

        return {
            totalInterest: totalInterest,
            totalPrincipalPaid: totalPrincipalPaid,
            totalPaid: totalInterest + totalPrincipalPaid,
            totalTax: totalTax,
            totalInsurance: totalInsurance,
            totalHOA: totalHOA,
            totalPMI: totalPMI,
            totalAllIn: totalPrincipalPaid + totalInterest + totalTax + totalInsurance + totalHOA + totalPMI,
            termResults: termResults,
            schedule: schedule,
            paidOff: balance < 0.01,
            principal: principal,
            pmiLabel: country === "ca" ? "Default Ins." : "PMI",
        };
    }

    // --- Results rendering ---

    function render() {
        var principal = parseFloat(loanAmountInput.value) || 0;
        var amort = parseInt(amortInput.value, 10) || 25;
        var annualIncrease = parseFloat(paymentIncreaseInput.value) || 0;
        var lumpAnnual = parseFloat(lumpSumAnnualInput.value) || 0;
        var lumpTerm = parseFloat(lumpSumTermInput.value) || 0;
        var annualTax = parseFloat(propertyTaxInput.value) || 0;
        var annualInsurance = parseFloat(homeInsuranceInput.value) || 0;
        var monthlyHOA = parseFloat(hoaInput.value) || 0;
        var annualPMI = parseFloat(pmiInput.value) || 0;
        var startMonth = parseInt(startMonthInput.value, 10) || 0;
        var startYear = parseInt(startYearInput.value, 10) || 2026;

        if (principal <= 0 || terms.length === 0) {
            resultsEl.classList.remove("visible");
            chartSection.classList.remove("visible");
            pieSection.classList.remove("visible");
            scheduleSection.style.display = "none";
            return;
        }

        var sim = simulateMortgage(principal, amort, terms, annualIncrease, lumpAnnual, lumpTerm, annualTax, annualInsurance, monthlyHOA, annualPMI, startMonth, startYear);
        lastSimResult = sim;

        // Update hook
        hookLoan.textContent = fmt(principal);
        hookInterest.textContent = fmt(sim.totalInterest);

        // Summary
        var html =
            '<div class="result-summary">' +
            '<div class="summary-card"><div class="label">Total Cost (All-In)</div><div class="value">' + fmt(sim.totalAllIn) + '</div></div>' +
            '<div class="summary-card"><div class="label">Total Interest</div><div class="value">' + fmt(sim.totalInterest) + '</div></div>' +
            '<div class="summary-card accent"><div class="label">Interest / Payments</div><div class="value">' + fmtPct(sim.totalPaid > 0 ? sim.totalInterest / sim.totalPaid * 100 : 0) + '</div></div>' +
            '</div>';

        // Bi-weekly comparison
        var firstTerm = sim.termResults[0];
        if (firstTerm && firstTerm.schedule === "monthly") {
            var monthlyPay = firstTerm.basePayment;
            var biweeklyPay = monthlyPay / 2;
            var biweeklyAnnual = biweeklyPay * 26;
            var monthlyAnnual = monthlyPay * 12;
            var extraPerYear = biweeklyAnnual - monthlyAnnual;
            html += '<div class="biweekly-compare">Switch to bi-weekly payments of <strong>' + fmtFull(biweeklyPay) + '</strong>? That puts <strong>' + fmt(extraPerYear) + ' extra/year</strong> toward your mortgage, cutting years off the amortization.</div>';
        }

        // Per-term breakdown
        sim.termResults.forEach(function (tr, i) {
            html +=
                '<div class="term-result">' +
                '<h4>Term ' + (i + 1) + ' &mdash; ' + tr.years + ' yr @ ' + tr.rate + '% (' + scheduleLabel(tr.schedule) + ')</h4>' +
                '<dl class="term-result-grid">' +
                '<div><dt>Payment</dt><dd>' + fmtFull(tr.basePayment) + '</dd></div>' +
                '<div><dt>Principal Paid</dt><dd>' + fmt(tr.principalPaid) + '</dd></div>' +
                '<div><dt>Interest Paid</dt><dd>' + fmt(tr.interestPaid) + '</dd></div>' +
                '<div><dt>Total P&I</dt><dd>' + fmt(tr.totalPayments) + '</dd></div>' +
                '<div><dt>Balance at End</dt><dd>' + fmt(tr.balanceAtEnd) + '</dd></div>' +
                '<div><dt>Interest Share</dt><dd>' + fmtPct(tr.totalPayments > 0 ? tr.interestPaid / tr.totalPayments * 100 : 0) + '</dd></div>' +
                (tr.pmi > 0 ? '<div><dt>' + tr.pmiLabel + '</dt><dd>' + fmt(tr.pmi) + '</dd></div>' : '') +
                '</dl>' +
                '</div>';
        });

        // Scenario comparison
        var optOffset = parseFloat(rateOptimisticInput.value) || 0;
        var pessOffset = parseFloat(ratePessimisticInput.value) || 0;
        if (optOffset !== 0 || pessOffset !== 0) {
            var optTerms = terms.map(function (t) { return { years: t.years, rate: Math.max(0, t.rate + optOffset), schedule: t.schedule }; });
            var pessTerms = terms.map(function (t) { return { years: t.years, rate: t.rate + pessOffset, schedule: t.schedule }; });
            var simOpt = simulateMortgage(principal, amort, optTerms, annualIncrease, lumpAnnual, lumpTerm, annualTax, annualInsurance, monthlyHOA, annualPMI, startMonth, startYear);
            var simPess = simulateMortgage(principal, amort, pessTerms, annualIncrease, lumpAnnual, lumpTerm, annualTax, annualInsurance, monthlyHOA, annualPMI, startMonth, startYear);

            html +=
                '<div class="scenario-compare">' +
                '<table class="scenario-table">' +
                '<thead><tr><th></th>' +
                '<th><span class="scenario-label opt">Optimistic ' + fmtPct(optOffset) + '</span></th>' +
                '<th>Base</th>' +
                '<th><span class="scenario-label pess">Pessimistic +' + fmtPct(pessOffset) + '</span></th>' +
                '</tr></thead><tbody>' +
                '<tr><td>Monthly Payment</td><td>' + fmtFull(simOpt.termResults[0].basePayment) + '</td><td>' + fmtFull(sim.termResults[0].basePayment) + '</td><td>' + fmtFull(simPess.termResults[0].basePayment) + '</td></tr>' +
                '<tr><td>Total Interest</td><td>' + fmt(simOpt.totalInterest) + '</td><td>' + fmt(sim.totalInterest) + '</td><td>' + fmt(simPess.totalInterest) + '</td></tr>' +
                '<tr><td>Total Cost</td><td>' + fmt(simOpt.totalAllIn) + '</td><td>' + fmt(sim.totalAllIn) + '</td><td>' + fmt(simPess.totalAllIn) + '</td></tr>' +
                '<tr><td>Interest Share</td><td>' + fmtPct(simOpt.totalPaid > 0 ? simOpt.totalInterest / simOpt.totalPaid * 100 : 0) + '</td><td>' + fmtPct(sim.totalPaid > 0 ? sim.totalInterest / sim.totalPaid * 100 : 0) + '</td><td>' + fmtPct(simPess.totalPaid > 0 ? simPess.totalInterest / simPess.totalPaid * 100 : 0) + '</td></tr>' +
                '<tr><td>Paid Off</td><td>' + (simOpt.paidOff ? 'Yes' : 'No') + '</td><td>' + (sim.paidOff ? 'Yes' : 'No') + '</td><td>' + (simPess.paidOff ? 'Yes' : 'No') + '</td></tr>' +
                '</tbody></table></div>';
        }

        // Missing years to amortization
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
            html += '<p class="hint" style="margin-top:0.5rem;color:#c0392b;font-size:0.8125rem;font-weight:600;">Mortgage not fully paid after all terms. Remaining balance: ' + fmt(sim.termResults[sim.termResults.length - 1].balanceAtEnd) + '</p>';
        }

        resultsEl.innerHTML = html;
        resultsEl.classList.add("visible");

        drawInterestChart(sim);
        chartSection.classList.add("visible");

        drawPieChart(sim);
        pieSection.classList.add("visible");

        renderSchedule(sim);
        saveState();
    }

    // --- Interest per term bar chart ---

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function drawInterestChart(sim) {
        var canvas = document.getElementById("interestChart");
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        var W = rect.width;
        var H = rect.height;
        var pad = { top: 25, right: 20, bottom: 40, left: 60 };
        var plotW = W - pad.left - pad.right;
        var plotH = H - pad.top - pad.bottom;

        ctx.clearRect(0, 0, W, H);

        var tr = sim.termResults;
        if (tr.length === 0) return;

        var maxInterest = 0;
        tr.forEach(function (t) { if (t.interestPaid > maxInterest) maxInterest = t.interestPaid; });
        if (maxInterest === 0) return;

        var niceMax = Math.ceil(maxInterest / 5000) * 5000;
        if (niceMax === 0) niceMax = 5000;

        var barGroupWidth = plotW / tr.length;
        var barWidth = Math.min(barGroupWidth * 0.55, 60);

        // Grid
        ctx.strokeStyle = cssVar("--chart-line");
        ctx.lineWidth = 1;
        ctx.font = '10px "SF Mono", "Roboto Mono", Menlo, monospace';
        ctx.fillStyle = cssVar("--chart-text");
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        for (var g = 0; g <= 4; g++) {
            var y = pad.top + (plotH / 4) * g;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + plotW, y);
            ctx.stroke();
            var val = niceMax * (1 - g / 4);
            ctx.fillText(fmt(val), pad.left - 6, y);
        }

        // Bars
        tr.forEach(function (t, i) {
            var cx = pad.left + barGroupWidth * i + barGroupWidth / 2;
            var x = cx - barWidth / 2;
            var bHeight = (t.interestPaid / niceMax) * plotH;

            ctx.fillStyle = termColors[i % termColors.length];
            ctx.fillRect(x, pad.top + plotH - bHeight, barWidth, bHeight);

            // Value on top
            ctx.fillStyle = cssVar("--text-2");
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.font = '10px "SF Mono", "Roboto Mono", Menlo, monospace';
            ctx.fillText(fmt(t.interestPaid), cx, pad.top + plotH - bHeight - 4);

            // Term label
            ctx.fillStyle = cssVar("--text-2");
            ctx.textBaseline = "top";
            ctx.font = '600 10px -apple-system, system-ui, sans-serif';
            ctx.fillText("TERM " + (i + 1), cx, pad.top + plotH + 6);
            ctx.font = '10px "SF Mono", "Roboto Mono", Menlo, monospace';
            ctx.fillStyle = cssVar("--text-3");
            ctx.fillText(t.years + "yr @ " + t.rate + "%", cx, pad.top + plotH + 20);
        });

        // Y-axis label
        ctx.save();
        ctx.translate(14, pad.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = cssVar("--chart-text");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '600 10px -apple-system, system-ui, sans-serif';
        ctx.fillText("INTEREST PAID", 0, 0);
        ctx.restore();
    }

    // --- Pie chart: total cost breakdown ---

    function drawPieChart(sim) {
        var canvas = document.getElementById("pieChart");
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        var W = rect.width;
        var H = rect.height;
        ctx.clearRect(0, 0, W, H);

        var slices = [
            { label: "Principal", value: sim.totalPrincipalPaid, color: pieColors[0] },
            { label: "Interest", value: sim.totalInterest, color: pieColors[1] },
            { label: "Property Tax", value: sim.totalTax, color: pieColors[2] },
            { label: "Insurance", value: sim.totalInsurance, color: pieColors[3] },
            { label: country === "ca" ? "Condo Fees" : "HOA", value: sim.totalHOA, color: pieColors[4] },
        ];

        if (sim.totalPMI > 0) {
            slices.push({ label: sim.pmiLabel, value: sim.totalPMI, color: pieColors[5] });
        }

        slices = slices.filter(function (s) { return s.value > 0; });

        if (slices.length === 0) return;

        var total = 0;
        slices.forEach(function (s) { total += s.value; });
        if (total === 0) return;

        var cx = W * 0.35;
        var cy = H / 2;
        var radius = Math.min(cx - 20, cy - 15, 100);
        var startAngle = -Math.PI / 2;

        slices.forEach(function (s) {
            var sliceAngle = (s.value / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = s.color;
            ctx.fill();
            startAngle += sliceAngle;
        });

        // Inner circle for donut
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
        ctx.fillStyle = cssVar("--bg");
        ctx.fill();

        // Center text
        ctx.fillStyle = cssVar("--text");
        ctx.font = '600 13px "SF Mono", "Roboto Mono", Menlo, monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fmt(total), cx, cy - 6);
        ctx.font = '600 9px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = cssVar("--chart-text");
        ctx.fillText("TOTAL COST", cx, cy + 8);

        // Legend
        var legendX = W * 0.65;
        var legendY = cy - slices.length * 13;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = '600 10px -apple-system, system-ui, sans-serif';

        slices.forEach(function (s, i) {
            var ly = legendY + i * 26;
            ctx.fillStyle = s.color;
            ctx.fillRect(legendX, ly - 5, 12, 10);

            ctx.fillStyle = cssVar("--text");
            ctx.fillText(s.label, legendX + 18, ly);

            ctx.fillStyle = cssVar("--chart-text");
            ctx.font = '10px "SF Mono", "Roboto Mono", Menlo, monospace';
            ctx.fillText(fmt(s.value) + " (" + (s.value / total * 100).toFixed(1) + "%)", legendX + 18, ly + 13);
            ctx.font = '600 10px -apple-system, system-ui, sans-serif';
        });
    }

    // --- Amortization schedule ---

    function renderSchedule(sim) {
        scheduleSection.style.display = "block";
        var rows = sim.schedule;

        if (scheduleMode === "annual") {
            var byYear = {};
            rows.forEach(function (r) {
                var key = r.year;
                if (!byYear[key]) byYear[key] = { year: key, termIndex: r.termIndex, payment: 0, principal: 0, interest: 0, tax: 0, insurance: 0, hoa: 0, pmi: 0, balance: 0 };
                byYear[key].payment += r.payment;
                byYear[key].principal += r.principal;
                byYear[key].interest += r.interest;
                byYear[key].tax += r.tax;
                byYear[key].insurance += r.insurance;
                byYear[key].hoa += r.hoa;
                byYear[key].pmi += r.pmi;
                byYear[key].balance = r.balance;
            });
            var yearRows = Object.keys(byYear).sort(function (a, b) { return a - b; }).map(function (k) { return byYear[k]; });

            scheduleTableHead.innerHTML = "<tr><th>Year</th><th>Payment</th><th>Principal</th><th>Interest</th>" +
                (sim.totalPMI > 0 ? "<th>" + sim.pmiLabel + "</th>" : "") +
                "<th>Tax</th><th>Ins.</th><th>" + (country === "ca" ? "Condo" : "HOA") + "</th><th>Balance</th></tr>";

            var html = "";
            var prevTerm = -1;
            yearRows.forEach(function (r) {
                var cls = r.termIndex !== prevTerm ? ' class="term-boundary"' : "";
                prevTerm = r.termIndex;
                html += "<tr" + cls + ">" +
                    "<td>" + r.year + "</td>" +
                    "<td>" + fmt(r.payment) + "</td>" +
                    "<td>" + fmt(r.principal) + "</td>" +
                    "<td>" + fmt(r.interest) + "</td>" +
                    (sim.totalPMI > 0 ? "<td>" + fmt(r.pmi) + "</td>" : "") +
                    "<td>" + fmt(r.tax) + "</td>" +
                    "<td>" + fmt(r.insurance) + "</td>" +
                    "<td>" + fmt(r.hoa) + "</td>" +
                    "<td>" + fmt(r.balance) + "</td>" +
                    "</tr>";
            });
            scheduleTableBody.innerHTML = html;
        } else {
            scheduleTableHead.innerHTML = "<tr><th>Date</th><th>Payment</th><th>Principal</th><th>Interest</th>" +
                (sim.totalPMI > 0 ? "<th>" + sim.pmiLabel + "</th>" : "") +
                "<th>Balance</th></tr>";

            var html = "";
            var prevTerm = -1;
            rows.forEach(function (r) {
                var cls = r.termIndex !== prevTerm ? ' class="term-boundary"' : "";
                prevTerm = r.termIndex;
                html += "<tr" + cls + ">" +
                    "<td>" + monthNames[r.month] + " " + r.year + "</td>" +
                    "<td>" + fmt(r.payment) + "</td>" +
                    "<td>" + fmt(r.principal) + "</td>" +
                    "<td>" + fmt(r.interest) + "</td>" +
                    (sim.totalPMI > 0 ? "<td>" + fmt(r.pmi) + "</td>" : "") +
                    "<td>" + fmt(r.balance) + "</td>" +
                    "</tr>";
            });
            scheduleTableBody.innerHTML = html;
        }
    }

    // Schedule toggle
    btnMonthly.addEventListener("click", function () {
        scheduleMode = "monthly";
        btnMonthly.classList.add("active");
        btnAnnual.classList.remove("active");
        if (lastSimResult) renderSchedule(lastSimResult);
    });

    btnAnnual.addEventListener("click", function () {
        scheduleMode = "annual";
        btnAnnual.classList.add("active");
        btnMonthly.classList.remove("active");
        if (lastSimResult) renderSchedule(lastSimResult);
    });

    // --- Event bindings ---

    [amortInput, paymentIncreaseInput, lumpSumAnnualInput, lumpSumTermInput,
     propertyTaxInput, homeInsuranceInput, hoaInput, pmiInput, startYearInput,
     rateOptimisticInput, ratePessimisticInput].forEach(function (el) {
        el.addEventListener("input", render);
    });

    startMonthInput.addEventListener("change", render);

    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { if (lastSimResult) render(); }, 150);
    });

    // Re-render charts when theme changes (canvas doesn't respond to CSS)
    new MutationObserver(function () {
        if (lastSimResult) {
            drawInterestChart(lastSimResult);
            drawPieChart(lastSimResult);
        }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // --- Init ---

    var saved = loadState();
    if (saved && applyState(saved)) {
        // Restored from localStorage
    } else {
        terms = countryConfig.ca.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate, schedule: t.schedule }; });
    }
    syncLoan();
    renderTerms();
    renderCountryInfo();
    loadCollapsedState();
    render();

    // Clear all button
    btnClear.addEventListener("click", function () {
        clearState();
        try { localStorage.removeItem(LS_KEY + "-collapsed"); } catch (e) {}
        country = "ca";
        btnCA.classList.add("active");
        btnUS.classList.remove("active");
        var cfg = countryConfig.ca;
        pmiLabel.textContent = cfg.insuranceLabel;
        hoaLabel.textContent = cfg.hoaLabel;
        propertyTaxLabel.textContent = cfg.taxLabel;
        amortInput.max = cfg.maxAmort;

        homeValueInput.value = 500000;
        downPaymentInput.value = 100000;
        amortInput.value = cfg.defaultAmort;
        paymentIncreaseInput.value = 0;
        lumpSumAnnualInput.value = 0;
        lumpSumTermInput.value = 0;
        propertyTaxInput.value = 3500;
        homeInsuranceInput.value = 1200;
        hoaInput.value = 0;
        pmiInput.value = 0;
        startMonthInput.value = 5;
        startYearInput.value = 2026;
        rateOptimisticInput.value = -1;
        ratePessimisticInput.value = 2;

        terms = cfg.defaultTerms.map(function (t) { return { years: t.years, rate: t.rate, schedule: t.schedule }; });

        // Reset collapsibles to collapsed
        Object.keys(collapsibles).forEach(function (key) {
            collapsibles[key].body.classList.add("collapsed");
            collapsibles[key].arrow.classList.remove("open");
        });

        renderTerms();
        syncLoan();
        renderCountryInfo();
        render();
    });
})();
