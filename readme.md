# Berlin Wastewater Dashboard

This dashboard visualizes SARS-CoV-2 levels and other pathogens (e.g., RSV, Influenza) in Berlin’s wastewater to support public health monitoring through open environmental data.

The application fetches raw data from the Berlin Hygiene Monitor API and computes per-sample mean, min, and max values from six gene measurements to simplify visualization.

## Features

- Interactive time series chart of viral loads per wastewater treatment plant  
- Mean, min, and max values calculated per sample (N1 & N2 gene targets)  
- Unified global Y-axis scaling for consistent comparison across stations  
- Dropdown selection of measuring points, including a population-weighted "Berlin trend" curve  
- Daily fetch of live data from the public API  
- Automatic de-duplication of previously fetched records  
- Modular TypeScript-based code structure  
- Responsive layout (in progress) with dynamic X-axis domain and optimized tick labels

## Technologies Used

- D3.js (v7)
- TypeScript
- Node.js (ESM) for data fetching and merging
- Vite for development and bundling
- HTML5 & SCSS (BEM, responsive with clamp-based typography)
- Fetch API (Frontend loads JSON data at runtime from `public/data/data.json`)
- Open Data from the [Berlin Hygiene Monitor](https://hygiene-monitor.de/dashboard/corona)

## Setup

1. Clone the repository:  
   ```bash
   git clone https://github.com/plutonik-a/berlin-wastewater-dashboard-ts.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run local development server:
   ```bash
   npm run dev
   ```
4. Open your browser at:
   ```bash
   http://localhost:5173
   ```

## Fetching New Data

To fetch new data from the official API:
```bash
npm run fetch
```
The script automatically compares against existing entries and merges only new records into `public/data/data.json`.

This file is served directly by the frontend and is fetched at runtime.

A timestamped console log shows which dates were added.

## Data Source

Data is provided by the Berlin Hygiene Monitor API:  
[https://api.hygiene-monitor.de/openData/getCovidOpenDataByDateRange](https://api.hygiene-monitor.de/openData/getCovidOpenDataByDateRange)

The dataset contains results for SARS-CoV-2, Influenza, RSV, and PMMoV, collected using both RT-PCR and dPCR methods.  
Each wastewater sample includes multiple gene targets and replicates.

This dashboard visualizes the aggregated SARS-CoV-2 values per site and date by computing the mean of six dPCR copy numbers (3 × N1 + 3 × N2).  

A weighted time series is also provided that combines all three main wastewater treatment plants (Ruhleben, Schönerlinde, Waßmannsdorf).  
This curve uses 2020 population data for weighting and excludes BER airport, which is considered an external contribution not part of Berlin’s sewage system.

The displayed min–max range reflects the spread between lowest and highest value per sample.

Test categories include:

- SARS-CoV-2 (N1/N2 genes, various PCR methods)
- PMMoV (Pepper mild mottle virus, used for normalization)
- Influenza A and B
- RSV (Respiratory Syncytial Virus)
- Occasionally: sequencing data (NGS Illumina)

## License

This project is licensed under the ISC License.
See the [LICENSE](./LICENSE.txt) file for details.

## Contact

For questions or suggestions, feel free to open an issue or contact directly.