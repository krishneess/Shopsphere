Add-Type -AssemblyName System.Drawing

$width = 2400
$height = 1380
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: Crisp off-white / light slate
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# Subtle grid dots
$dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 232, 240))


# Helper for Drawing Cards
function Draw-Card {
    param(
        [System.Drawing.Graphics]$graphics,
        [float]$x, [float]$y, [float]$w, [float]$h, [float]$radius,
        [System.Drawing.Color]$bgColor,
        [System.Drawing.Color]$borderColor,
        [float]$borderWidth = 2
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    # Subtle shadow
    $shadowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shadowPath.AddArc($x+3, $y+4, $d, $d, 180, 90)
    $shadowPath.AddArc($x + $w - $d + 3, $y+4, $d, $d, 270, 90)
    $shadowPath.AddArc($x + $w - $d + 3, $y + $h - $d + 4, $d, $d, 0, 90)
    $shadowPath.AddArc($x+3, $y + $h - $d + 4, $d, $d, 90, 90)
    $shadowPath.CloseFigure()
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 0, 0, 0))
    $graphics.FillPath($shadowBrush, $shadowPath)
    $shadowBrush.Dispose()
    $shadowPath.Dispose()

    # Fill
    $brush = New-Object System.Drawing.SolidBrush ($bgColor)
    $graphics.FillPath($brush, $path)
    $brush.Dispose()

    # Border
    $pen = New-Object System.Drawing.Pen ($borderColor, $borderWidth)
    $graphics.DrawPath($pen, $path)
    $pen.Dispose()

    $path.Dispose()
}

function Draw-Badge {
    param(
        [System.Drawing.Graphics]$graphics,
        [string]$text,
        [float]$x, [float]$y,
        [System.Drawing.Color]$bgColor,
        [System.Drawing.Color]$textColor,
        [System.Drawing.Font]$font
    )
    $size = $graphics.MeasureString($text, $font)
    $w = $size.Width + 18
    $h = $size.Height + 8
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = 8
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $bBg = New-Object System.Drawing.SolidBrush ($bgColor)
    $graphics.FillPath($bBg, $path)
    $bBg.Dispose()

    $bText = New-Object System.Drawing.SolidBrush ($textColor)
    $graphics.DrawString($text, $font, $bText, ($x + 9), ($y + 4))
    $bText.Dispose()

    $path.Dispose()
}

function Draw-Text {
    param(
        [System.Drawing.Graphics]$graphics,
        [string]$text,
        [System.Drawing.Font]$font,
        [System.Drawing.Color]$color,
        [float]$x, [float]$y
    )
    $brush = New-Object System.Drawing.SolidBrush ($color)
    $graphics.DrawString($text, $font, $brush, $x, $y)
    $brush.Dispose()
}

function Draw-Arrow {
    param(
        [System.Drawing.Graphics]$graphics,
        [float]$x1, [float]$y1, [float]$x2, [float]$y2,
        [System.Drawing.Color]$color,
        [float]$width = 3,
        [string]$label = ""
    )
    $pen = New-Object System.Drawing.Pen ($color, $width)
    $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 7, 7, $true
    $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
    $pen.Dispose()

    if ($label -ne "") {
        $fontLbl = New-Object System.Drawing.Font ("Segoe UI", [float]11, [System.Drawing.FontStyle]::Bold)
        $brush = New-Object System.Drawing.SolidBrush ($color)
        $midX = ($x1 + $x2) / 2
        $midY = ($y1 + $y2) / 2 - 22
        $graphics.DrawString($label, $fontLbl, $brush, $midX - 30, $midY)
        $brush.Dispose()
        $fontLbl.Dispose()
    }
}

# Fonts
$fTitle      = New-Object System.Drawing.Font ("Segoe UI", [float]28, [System.Drawing.FontStyle]::Bold)
$fSubtitle   = New-Object System.Drawing.Font ("Segoe UI", [float]13, [System.Drawing.FontStyle]::Regular)
$fCardTitle  = New-Object System.Drawing.Font ("Segoe UI", [float]17, [System.Drawing.FontStyle]::Bold)
$fBadge      = New-Object System.Drawing.Font ("Segoe UI", [float]10.5, [System.Drawing.FontStyle]::Bold)
$fBodyBold   = New-Object System.Drawing.Font ("Segoe UI", [float]12, [System.Drawing.FontStyle]::Bold)
$fBody       = New-Object System.Drawing.Font ("Segoe UI", [float]11.5, [System.Drawing.FontStyle]::Regular)
$fBodySmall  = New-Object System.Drawing.Font ("Segoe UI", [float]10.5, [System.Drawing.FontStyle]::Regular)
$fCode       = New-Object System.Drawing.Font ("Consolas", [float]11, [System.Drawing.FontStyle]::Bold)

# Color Constants
$cDark   = [System.Drawing.Color]::FromArgb(15, 23, 42)
$cMuted  = [System.Drawing.Color]::FromArgb(100, 116, 139)
$cTeal   = [System.Drawing.Color]::FromArgb(13, 148, 136)
$cNavy   = [System.Drawing.Color]::FromArgb(30, 41, 59)
$cAmber  = [System.Drawing.Color]::FromArgb(180, 83, 9)
$cGreen  = [System.Drawing.Color]::FromArgb(5, 150, 105)
$cIndigo = [System.Drawing.Color]::FromArgb(79, 70, 229)
$cBlue   = [System.Drawing.Color]::FromArgb(37, 99, 235)
$cRed    = [System.Drawing.Color]::FromArgb(185, 28, 28)

# TOP BANNER
Draw-Badge $g "UNIT 1 & PRACTICAL 1: DATA WAREHOUSING & ETL PIPELINE" 80 45 ([System.Drawing.Color]::FromArgb(204, 251, 241)) ([System.Drawing.Color]::FromArgb(15, 118, 110)) $fBadge
Draw-Badge $g "RETAIL INDUSTRY CASE STUDY" 600 45 ([System.Drawing.Color]::FromArgb(224, 231, 255)) ([System.Drawing.Color]::FromArgb(67, 56, 202)) $fBadge

Draw-Text $g "ShopSphere — Complete ETL Architecture & Data Quality Flow" $fTitle $cDark 80 80
Draw-Text $g "Comprehensive pipeline tracing Extract (Multi-format ingestion) -> Transform (Cleansing & Feature Engineering) -> Load (Atomic Data Mart) -> UI Data Quality Reporting" $fSubtitle $cMuted 82 135

# ==================== CARD 1: EXTRACT ====================
$c1X = 80; $c1Y = 190; $c1W = 460; $c1H = 500
Draw-Card $g $c1X $c1Y $c1W $c1H 16 ([System.Drawing.Color]::White) ([System.Drawing.Color]::FromArgb(203, 213, 225)) 2
Draw-Badge $g "STAGE 01: EXTRACT" ($c1X + 24) ($c1Y + 24) ([System.Drawing.Color]::FromArgb(240, 253, 250)) ([System.Drawing.Color]::FromArgb(13, 148, 136)) $fBadge

Draw-Text $g "Multi-Format Ingestion" $fCardTitle $cDark ($c1X + 24) ($c1Y + 62)
Draw-Text $g "Endpoint: POST /api/sales/upload" $fCode $cTeal ($c1X + 24) ($c1Y + 98)
Draw-Text $g "File: server/routes/sales.js (Lines 16-60)" $fBodySmall $cMuted ($c1X + 24) ($c1Y + 120)

$sepPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(241, 245, 249), 2)
$g.DrawLine($sepPen, ($c1X + 24), ($c1Y + 145), ($c1X + $c1W - 24), ($c1Y + 145))

Draw-Text $g "1. File Ingestion & Staging:" $fBodyBold $cNavy ($c1X + 24) ($c1Y + 160)
Draw-Text $g "• Accepts .csv, .xlsx, and .xls spreadsheets`n• Size limit: 10 MB ceiling enforced via Multer`n• Destination: server/uploads/raw/`n• Renamed: sales-{timestamp}.{ext}" $fBody $cMuted ($c1X + 24) ($c1Y + 185)

Draw-Text $g "2. Dual Parsing Engines:" $fBodyBold $cNavy ($c1X + 24) ($c1Y + 275)
Draw-Text $g "• CSV: ReadStream piped to csv-parser`n  (Memory-efficient asynchronous streaming)`n• Excel: SheetJS (xlsx.readFile)`n  Extracts primary worksheet into JSON objects" $fBody $cMuted ($c1X + 24) ($c1Y + 300)

Draw-Text $g "3. Extracted In-Memory Payload:" $fBodyBold $cNavy ($c1X + 24) ($c1Y + 395)
Draw-Text $g "• Returns raw rows[] for transformation`n• extractedCount = rows.length" $fBody $cMuted ($c1X + 24) ($c1Y + 420)


# ==================== CARD 2: TRANSFORM ====================
$c2X = 610; $c2Y = 190; $c2W = 540; $c2H = 500
Draw-Card $g $c2X $c2Y $c2W $c2H 16 ([System.Drawing.Color]::White) ([System.Drawing.Color]::FromArgb(203, 213, 225)) 2
Draw-Badge $g "STAGE 02: TRANSFORM" ($c2X + 24) ($c2Y + 24) ([System.Drawing.Color]::FromArgb(254, 243, 199)) $cAmber $fBadge

Draw-Text $g "Data Cleansing & Validation" $fCardTitle $cDark ($c2X + 24) ($c2Y + 62)
Draw-Text $g "Function: cleanSalesRows(rows)" $fCode $cAmber ($c2X + 24) ($c2Y + 98)
Draw-Text $g "File: server/routes/sales.js (Lines 62-124)" $fBodySmall $cMuted ($c2X + 24) ($c2Y + 120)

$g.DrawLine($sepPen, ($c2X + 24), ($c2Y + 145), ($c2X + $c2W - 24), ($c2Y + 145))

Draw-Text $g "1. 9 Mandatory Schema Attributes:" $fBodyBold $cNavy ($c2X + 24) ($c2Y + 160)
Draw-Text $g "orderId, orderDate, productId, productName, category,`nquantity, unitPrice, unitCost, returned" $fCode ([System.Drawing.Color]::FromArgb(51, 65, 85)) ($c2X + 24) ($c2Y + 185)

Draw-Text $g "2. Strict Domain Integrity Rules:" $fBodyBold $cNavy ($c2X + 24) ($c2Y + 230)
Draw-Text $g "• Dates: new Date(row.orderDate) must be valid timestamp`n• Quantity: Integer assertion (Number.isInteger) & Q > 0`n• Currency: Finite float (Number.isFinite) & Price, Cost >= 0`n• Boolean: returned must be exactly 'true' or 'false'`n• Strings: Trimmed whitespace across identifiers/categories" $fBody $cMuted ($c2X + 24) ($c2Y + 255)

Draw-Text $g "3. Routing Decision Split:" $fBodyBold $cNavy ($c2X + 24) ($c2Y + 380)
Draw-Text $g "• Fails any rule  -> Route to Rejection Audit (Dropped)`n• Passes all rules -> Route to Feature Engineering" $fBody $cMuted ($c2X + 24) ($c2Y + 405)


# ==================== CARD 3: REJECTION AUDIT ====================
$c3X = 610; $c3Y = 740; $c3W = 540; $c3H = 340
Draw-Card $g $c3X $c3Y $c3W $c3H 16 ([System.Drawing.Color]::FromArgb(254, 242, 242)) ([System.Drawing.Color]::FromArgb(252, 165, 165)) 2
Draw-Badge $g "REJECTION & AUDIT LOG" ($c3X + 24) ($c3Y + 24) ([System.Drawing.Color]::FromArgb(254, 226, 226)) $cRed $fBadge

Draw-Text $g "Dirty Data Isolation (Zero Pollution)" $fCardTitle ([System.Drawing.Color]::FromArgb(153, 27, 27)) ($c3X + 24) ($c3Y + 62)
Draw-Text $g "• Dropped from insertion — zero dirty data enters warehouse`n• Exact Row Index tracked: (index + 2) accounting for header`n• Granular error causality logged:`n  - 'Missing fields: [field1, field2]'`n  - 'Invalid date, quantity, price, cost, or return value'`n• Output: rejected[] returned in response for manager review" $fBody ([System.Drawing.Color]::FromArgb(127, 29, 29)) ($c3X + 24) ($c3Y + 115)


# ==================== CARD 4: FEATURE ENGINEERING ====================
$c4X = 1220; $c4Y = 190; $c4W = 520; $c4H = 500
Draw-Card $g $c4X $c4Y $c4W $c4H 16 ([System.Drawing.Color]::White) ([System.Drawing.Color]::FromArgb(203, 213, 225)) 2
Draw-Badge $g "FEATURE ENGINEERING" ($c4X + 24) ($c4Y + 24) ([System.Drawing.Color]::FromArgb(236, 253, 245)) $cGreen $fBadge

Draw-Text $g "Derived Business Measures" $fCardTitle $cDark ($c4X + 24) ($c4Y + 62)
Draw-Text $g "Enriching Validated Records" $fCode $cGreen ($c4X + 24) ($c4Y + 98)
Draw-Text $g "File: server/routes/sales.js (Lines 116-121)" $fBodySmall $cMuted ($c4X + 24) ($c4Y + 120)

$g.DrawLine($sepPen, ($c4X + 24), ($c4Y + 145), ($c4X + $c4W - 24), ($c4Y + 145))

Draw-Text $g "1. Financial Feature Generation:" $fBodyBold $cNavy ($c4X + 24) ($c4Y + 160)
Draw-Text $g "Automatically computes analytical fields for each row:" $fBody $cMuted ($c4X + 24) ($c4Y + 185)

# Math Formula Boxes
Draw-Card $g ($c4X + 24) ($c4Y + 215) ($c4W - 48) 45 8 ([System.Drawing.Color]::FromArgb(240, 253, 250)) ([System.Drawing.Color]::FromArgb(153, 246, 228)) 1
Draw-Text $g "revenue = quantity * unitPrice" $fCode ([System.Drawing.Color]::FromArgb(15, 118, 110)) ($c4X + 40) ($c4Y + 228)

Draw-Card $g ($c4X + 24) ($c4Y + 270) ($c4W - 48) 45 8 ([System.Drawing.Color]::FromArgb(240, 253, 250)) ([System.Drawing.Color]::FromArgb(153, 246, 228)) 1
Draw-Text $g "cost    = quantity * unitCost" $fCode ([System.Drawing.Color]::FromArgb(15, 118, 110)) ($c4X + 40) ($c4Y + 283)

Draw-Card $g ($c4X + 24) ($c4Y + 325) ($c4W - 48) 45 8 ([System.Drawing.Color]::FromArgb(240, 253, 250)) ([System.Drawing.Color]::FromArgb(153, 246, 228)) 1
Draw-Text $g "profit  = revenue - cost" $fCode ([System.Drawing.Color]::FromArgb(15, 118, 110)) ($c4X + 40) ($c4Y + 338)

Draw-Text $g "2. Analytical Staging:" $fBodyBold $cNavy ($c4X + 24) ($c4Y + 395)
Draw-Text $g "• Populates clean accepted[] records ready for warehouse`n• Powers OLAP Cubes, ML Regression & Statistics" $fBody $cMuted ($c4X + 24) ($c4Y + 420)


# ==================== CARD 5: LOAD ====================
$c5X = 1810; $c5Y = 190; $c5W = 510; $c5H = 500
Draw-Card $g $c5X $c5Y $c5W $c5H 16 ([System.Drawing.Color]::White) ([System.Drawing.Color]::FromArgb(203, 213, 225)) 2
Draw-Badge $g "STAGE 03: LOAD" ($c5X + 24) ($c5Y + 24) ([System.Drawing.Color]::FromArgb(238, 242, 255)) $cIndigo $fBadge

Draw-Text $g "Atomic Warehouse Load" $fCardTitle $cDark ($c5X + 24) ($c5Y + 62)
Draw-Text $g "Target: MongoDB Atlas ('sales')" $fCode $cIndigo ($c5X + 24) ($c5Y + 98)
Draw-Text $g "File: server/routes/sales.js (Lines 160-178)" $fBodySmall $cMuted ($c5X + 24) ($c5Y + 120)

$g.DrawLine($sepPen, ($c5X + 24), ($c5Y + 145), ($c5X + $c5W - 24), ($c5Y + 145))

Draw-Text $g "1. Integrity Pre-Condition:" $fBodyBold $cNavy ($c5X + 24) ($c5Y + 160)
Draw-Text $g "• If accepted.length === 0 -> HTTP 400 rejection`n• Database remains untouched if no valid data exists" $fBody $cMuted ($c5X + 24) ($c5Y + 185)

Draw-Text $g "2. Atomic Batch Replacement:" $fBodyBold $cNavy ($c5X + 24) ($c5Y + 245)
Draw-Text $g "• Purges existing collection:`n  await db.collection('sales').deleteMany({})`n• High-throughput bulk insertion:`n  await db.collection('sales').insertMany(...)`n• Eliminates partial/corrupt update states" $fBody $cMuted ($c5X + 24) ($c5Y + 270)

Draw-Text $g "3. Data Lineage Metadata:" $fBodyBold $cNavy ($c5X + 24) ($c5Y + 375)
Draw-Text $g "• Injects audit timestamp: importedAt: new Date()`n• Tracks data provenance for warehouse history" $fBody $cMuted ($c5X + 24) ($c5Y + 400)


# ==================== CARD 6: DATA QUALITY DASHBOARD (MONITORING) ====================
$c6X = 1220; $c6Y = 740; $c6W = 1100; $c6H = 340
Draw-Card $g $c6X $c6Y $c6W $c6H 16 ([System.Drawing.Color]::White) ([System.Drawing.Color]::FromArgb(147, 197, 253)) 2
Draw-Badge $g "STAGE 04: QUALITY REPORTING" ($c6X + 24) ($c6Y + 24) ([System.Drawing.Color]::FromArgb(239, 246, 255)) $cBlue $fBadge

Draw-Text $g "Store Manager Data Quality Dashboard" $fCardTitle $cDark ($c6X + 24) ($c6Y + 62)
Draw-Text $g "Frontend: client/src/pages/ETLModule.jsx" $fCode $cBlue ($c6X + 24) ($c6Y + 98)

$g.DrawLine($sepPen, ($c6X + 24), ($c6Y + 125), ($c6X + $c6W - 24), ($c6Y + 125))

# Metric Pill 1: Quality Formula
Draw-Card $g ($c6X + 24) ($c6Y + 145) 490 150 12 ([System.Drawing.Color]::FromArgb(248, 250, 252)) ([System.Drawing.Color]::FromArgb(226, 232, 240)) 1
Draw-Text $g "Data Quality KPI Metric:" $fBodyBold $cNavy ($c6X + 44) ($c6Y + 160)
Draw-Text $g "Quality Score (%) = (acceptedCount / extractedCount) * 100" $fCode ([System.Drawing.Color]::FromArgb(13, 148, 136)) ($c6X + 44) ($c6Y + 190)
Draw-Text $g "Evaluates ingestion cleanliness and highlights source dataset`nhealth directly to retail store managers." $fBodySmall $cMuted ($c6X + 44) ($c6Y + 225)

# Metric Pill 2: Audit metrics
Draw-Card $g ($c6X + 540) ($c6Y + 145) 530 150 12 ([System.Drawing.Color]::FromArgb(248, 250, 252)) ([System.Drawing.Color]::FromArgb(226, 232, 240)) 1
Draw-Text $g "Managerial Audit & Feedback:" $fBodyBold $cNavy ($c6X + 560) ($c6Y + 160)
Draw-Text $g "• Real-time counters: Extracted, Accepted, Rejected counts`n• Interactive Rejected Rows Table with row numbers & reasons`n• Immediate trigger for downstream OLAP, Stats & ML models" $fBody $cMuted ($c6X + 560) ($c6Y + 190)


# ==================== CONNECTING ARROWS ====================
# Arrow 1: Extract -> Transform
Draw-Arrow $g ($c1X + $c1W) ($c1Y + 250) ($c2X) ($c1Y + 250) ([System.Drawing.Color]::FromArgb(148, 163, 184)) 3 "raw rows"

# Arrow 2: Transform -> Rejection (Down)
Draw-Arrow $g ($c2X + 270) ($c2Y + $c2H) ($c2X + 270) ($c3Y) ([System.Drawing.Color]::FromArgb(239, 68, 68)) 3 "invalid rows"

# Arrow 3: Transform -> Feature Engineering (Right)
Draw-Arrow $g ($c2X + $c2W) ($c2Y + 250) ($c4X) ($c2Y + 250) ([System.Drawing.Color]::FromArgb(16, 185, 129)) 3 "valid rows"

# Arrow 4: Feature Engineering -> Load
Draw-Arrow $g ($c4X + $c4W) ($c4Y + 250) ($c5X) ($c4Y + 250) ([System.Drawing.Color]::FromArgb(99, 102, 241)) 3 "accepted[]"

# Arrow 5: Load -> Dashboard (Down & Left)
$penFeedback = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(59, 130, 246), 3)
$penFeedback.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$penFeedback.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6, 6, $true
$g.DrawLine($penFeedback, ($c5X + 250), ($c5Y + $c5H), ($c5X + 250), ($c6Y + 70))
$g.DrawLine($penFeedback, ($c5X + 250), ($c6Y + 70), ($c6X + $c6W), ($c6Y + 70))
$penFeedback.Dispose()

# Arrow 6: Rejection -> Dashboard (Right)
Draw-Arrow $g ($c3X + $c3W) ($c3Y + 170) ($c6X) ($c6Y + 170) ([System.Drawing.Color]::FromArgb(239, 68, 68)) 3 "rejected[]"

# FOOTER
Draw-Text $g "ShopSphere: E-Commerce Intelligence and Decision Support Platform • Exploratory Data Analytics (2310321T / 2310321L)" $fBodySmall $cMuted 80 1320

# Save high-res PNG
$outputPath = "E:\EDA_project\shopsphere\etl_flowchart.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$bmp.Dispose()
$g.Dispose()
$sepPen.Dispose()

Write-Host "SUCCESS: Diagram created at $outputPath"

