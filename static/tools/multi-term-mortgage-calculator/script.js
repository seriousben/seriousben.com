(function () {
    var principalInput = document.getElementById("principal");
    var rateInput = document.getElementById("rate");
    var resultsEl = document.getElementById("results");
    var chartSection = document.getElementById("chart-section");
    var toggleButtons = document.querySelectorAll(".term-toggle");

    var colors = [
        { line: "#e74c3c", bg: "rgba(231,76,60,0.10)" },
        { line: "#3498db", bg: "rgba(52,152,219,0.10)" },
        { line: "#2ecc71", bg: "rgba(46,204,113,0.10)" },
        { line: "#f39c12", bg: "rgba(243,156,18,0.10)" },
        { line: "#9b59b6", bg: "rgba(155,89,182,0.10)" },
    ];

    function getActiveTerms() {
        var terms = [];
        toggleButtons.forEach(function (btn) {
            if (btn.classList.contains("active")) {
                terms.push(parseInt(btn.dataset.term, 10));
            }
        });
        return terms.sort(function (a, b) { return a - b; });
    }

    function calcMonthly(principal, annualRate, years) {
        if (principal <= 0 || years <= 0) return 0;
        if (annualRate === 0) return principal / (years * 12);
        var r = annualRate / 100 / 12;
        var n = years * 12;
        return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    function calcAmortization(principal, annualRate, years) {
        var monthly = calcMonthly(principal, annualRate, years);
        var r = annualRate / 100 / 12;
        var n = years * 12;
        var totalPaid = monthly * n;
        var totalInterest = totalPaid - principal;

        // Yearly balances for chart
        var balances = [principal];
        var balance = principal;
        for (var y = 1; y <= years; y++) {
            for (var m = 0; m < 12; m++) {
                var interest = balance * r;
                balance = balance - (monthly - interest);
                if (balance < 0) balance = 0;
            }
            balances.push(Math.round(balance * 100) / 100);
        }

        return { monthly: monthly, totalPaid: totalPaid, totalInterest: totalInterest, balances: balances, years: years };
    }

    function formatCurrency(val) {
        return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function formatCurrencyFull(val) {
        return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function render() {
        var principal = parseFloat(principalInput.value) || 0;
        var rate = parseFloat(rateInput.value) || 0;
        var terms = getActiveTerms();

        if (terms.length === 0) {
            resultsEl.innerHTML = '<p class="hint">Select at least one term to compare.</p>';
            chartSection.style.display = "none";
            return;
        }

        var results = terms.map(function (t) {
            return calcAmortization(principal, rate, t);
        });

        // Cards
        resultsEl.innerHTML = results.map(function (r, i) {
            var years = r.years;
            return '<div class="result-card">' +
                '<h3>' + years + '-Year Fixed</h3>' +
                '<div class="monthly">' + formatCurrencyFull(r.monthly) + ' <span>/mo</span></div>' +
                '<dl class="result-details">' +
                '<div><dt>Total Interest</dt><dd>' + formatCurrency(r.totalInterest) + '</dd></div>' +
                '<div><dt>Total Paid</dt><dd>' + formatCurrency(r.totalPaid) + '</dd></div>' +
                '<div><dt>Interest %</dt><dd>' + (r.totalPaid > 0 ? (r.totalInterest / r.totalPaid * 100).toFixed(1) : 0) + '%</dd></div>' +
                '</dl>' +
                '</div>';
        }).join("");

        // Chart
        chartSection.style.display = "block";
        drawChart(results);
    }

    function drawChart(results) {
        var canvas = document.getElementById("balanceChart");
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        var W = rect.width;
        var H = rect.height;
        var pad = { top: 20, right: 20, bottom: 35, left: 65 };
        var plotW = W - pad.left - pad.right;
        var plotH = H - pad.top - pad.bottom;

        ctx.clearRect(0, 0, W, H);

        var maxYears = Math.max.apply(null, results.map(function (r) { return r.years; }));
        var maxBalance = Math.max.apply(null, results.map(function (r) { return r.balances[0]; })) || 1;

        // Grid lines
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#999";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        for (var g = 0; g <= 4; g++) {
            var y = pad.top + (plotH / 4) * g;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + plotW, y);
            ctx.stroke();
            var val = maxBalance * (1 - g / 4);
            ctx.fillText(formatCurrency(val), pad.left - 8, y);
        }

        // X axis labels
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var xSteps = Math.min(maxYears, 6);
        for (var x = 0; x <= xSteps; x++) {
            var year = Math.round(maxYears / xSteps * x);
            var xp = pad.left + (year / maxYears) * plotW;
            ctx.fillText(year + "yr", xp, pad.top + plotH + 8);
        }

        // Lines
        results.forEach(function (r, i) {
            var color = colors[i % colors.length];
            ctx.strokeStyle = color.line;
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            var step = maxYears / 60; // ~60 data points for longest
            for (var t = 0; t <= r.years; t++) {
                var xp = pad.left + (t / maxYears) * plotW;
                var yp = pad.top + (1 - r.balances[t] / maxBalance) * plotH;
                if (t === 0) ctx.moveTo(xp, yp);
                else ctx.lineTo(xp, yp);
            }
            ctx.stroke();

            // Light fill
            ctx.fillStyle = color.bg;
            ctx.beginPath();
            for (var t = 0; t <= r.years; t++) {
                var xp = pad.left + (t / maxYears) * plotW;
                var yp = pad.top + (1 - r.balances[t] / maxBalance) * plotH;
                if (t === 0) ctx.moveTo(xp, yp);
                else ctx.lineTo(xp, yp);
            }
            ctx.lineTo(pad.left + (r.years / maxYears) * plotW, pad.top + plotH);
            ctx.lineTo(pad.left, pad.top + plotH);
            ctx.closePath();
            ctx.fill();
        });

        // Legend
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        var legendX = pad.left + 10;
        var legendY = pad.top + 12;
        results.forEach(function (r, i) {
            var color = colors[i % colors.length];
            ctx.fillStyle = color.line;
            ctx.fillRect(legendX, legendY - 5, 14, 10);
            ctx.fillStyle = "#555";
            ctx.fillText(r.years + " yr", legendX + 20, legendY);
            legendX += 70;
        });
    }

    // Toggle buttons
    toggleButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            btn.classList.toggle("active");
            btn.setAttribute("aria-pressed", btn.classList.contains("active"));
            render();
        });
    });

    // Input listeners
    principalInput.addEventListener("input", render);
    rateInput.addEventListener("input", render);

    // Redraw chart on resize
    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 150);
    });

    // Initial render
    render();
})();
