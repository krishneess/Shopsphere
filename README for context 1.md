# ShopSphere — Project Resume Context

> Context handoff for continuing the ShopSphere E-Commerce Intelligence and Decision Support Platform in a future ChatGPT conversation.

## Project Overview

- **Project:** ShopSphere — E-Commerce Intelligence and Decision Support Platform
- **Workspace:** `E:\EDA_project\shopsphere`
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Frontend dev URL:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`
- **Current status:** Regression Analysis module has been added and is displaying its metrics and charts. Most recent work focused on fixing chart label overlap and preserving chart rendering. The user wants to pause here and resume later.

## Existing Project Context

The project is intended to demonstrate data engineering and analytics topics, including:

- ETL and data quality
- Exploratory Data Analysis (EDA)
- OLAP operations
- Statistical analysis and correlation
- Regression and model evaluation

The dataset previously described contains about 144 records and fields such as:

`orderId`, `orderDate`, `productId`, `productName`, `category`, `quantity`, `unitPrice`, `unitCost`, `returned`

The dataset does not include advertising spend. Regression was implemented as a demonstration using quantity and unit cost to predict unit price.

## Relevant Frontend Files

Location: `E:\EDA_project\shopsphere\client\src\pages`

- `Functions.jsx` — Analysis module listing and conditional module rendering
- `Functions.css`
- `ETLModule.jsx`
- `EDAModule.jsx`
- `OLAPModule.jsx`
- `StatsModule.jsx`
- `RegressionModule.jsx` — Newly added regression frontend
- `RegressionModule.css` — Styles for regression module

### Functions.jsx Module Setup

`Functions.jsx` imports:

```jsx
import ETLModule from "./ETLModule";
import EDAModule from "./EDAModule";
import OLAPModule from "./OLAPModule";
import StatsModule from "./StatsModule";
import RegressionModule from "./RegressionModule";
```

The module list contains five modules:

1. ETL & Data Quality
2. Exploratory Data Analysis
3. OLAP Explorer
4. Statistical Analysis
5. Regression Analysis

The module count is `05 MODULES`. Selecting module id `regression` renders `<RegressionModule />`.

The existing workflow section still displays the general four-step flow:
Application Data → ETL Processing → EDA & OLAP → Decision Support.
It has not yet been revised to explicitly include regression.

## Regression Backend

The regression API endpoint is:

```text
GET http://localhost:5000/api/sales/regression
```

The endpoint is implemented in `server/routes/sales.js`, above `module.exports = router;`.

Known implementation details from the conversation:

- Uses sales records with numeric `quantity`, `unitCost`, and `unitPrice`
- Performs a deterministic 80/20 train/test split
- Uses multiple linear regression with gradient descent
- Uses 1500 iterations and learning rate `0.01`
- Returns:
  - `totalRecords`
  - `trainingRecords`
  - `testingRecords`
  - `metrics` (MAE, RMSE, R²)
  - `predictions`
  - `trainingLoss`

The user tested the endpoint in the browser and confirmed it worked.

## Regression Frontend Behavior

`RegressionModule.jsx` fetches:

```js
const API_URL = "http://localhost:5000/api/sales/regression";
```

It displays:

- Mean Absolute Error
- Root Mean Squared Error
- R² Score
- Test record count
- Actual vs Predicted Unit Price scatter chart
- Gradient Descent Training Loss line chart
- Train/test dataset split information

The frontend uses Recharts. If Vite reports that `recharts` cannot be resolved, install it from the client directory:

```bash
cd E:\EDA_project\shopsphere\client
npm install recharts
```

Then restart Vite:

```bash
npm run dev
```

## Latest UI Issue / Where We Left Off

The regression charts initially rendered, but text/axis labels overlapped. CSS and chart sizing were adjusted. After a subsequent CSS change, the chart plots appeared blank while their titles and legends remained visible.

The latest response provided full replacement code for both:

- `client/src/pages/RegressionModule.jsx`
- `client/src/pages/RegressionModule.css`

The latest JSX uses:
- Scatter chart `ResponsiveContainer` height: `320`
- Line chart `ResponsiveContainer` height: `280`
- Added chart margins and bottom legends

The latest CSS restores responsive sizing and includes limited Recharts-specific styling.

**Important:** The user has not yet confirmed whether this latest replacement fixed the blank charts. On resumption, first ask them to check the current result or have them share a screenshot/current files. Avoid making further speculative CSS changes. Fix the exact issue based on what is visible.

## User's Working Preferences

- User prefers clear, sequential instructions with exact file paths and exact paste locations.
- When asked for complete code, provide the entire updated file rather than isolated snippets.
- User sometimes says “in terminal itself” but has been pasting code directly into files in VS Code. Clarify if they mean terminal commands versus full file content only when needed.
- Avoid changing unrelated working features while fixing a specific issue.
- User wants changes limited to the problem they point out.
- Explain briefly what caused the issue and what exact file(s) are being changed.

## Next Resume Step

1. Continue from the Regression Analysis UI.
2. Confirm whether charts are now visible and labels no longer overlap.
3. If still broken, inspect the actual `RegressionModule.jsx` and `RegressionModule.css` before editing further.
4. Once stable, proceed to remaining Unit 4 regression/model evaluation features as appropriate (e.g. correlation/model evaluation visualizations or classification using the `returned` boolean), without claiming these are already implemented.

---
