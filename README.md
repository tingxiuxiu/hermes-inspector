# Test Automation Inspector

[![GitHub stars](https://img.shields.io/github/stars/test-automation-inspector/test-automation-inspector.svg)](https://github.com/test-automation-inspector/test-automation-inspector/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/test-automation-inspector/test-automation-inspector.svg)](https://github.com/test-automation-inspector/test-automation-inspector/network/members)
[![GitHub license](https://img.shields.io/github/license/test-automation-inspector/test-automation-inspector.svg)](https://github.com/test-automation-inspector/test-automation-inspector/blob/main/LICENSE)

## Overview

Test Automation Inspector is a powerful UI visual inspection tool for Android, Apple, and HarmonyOS devices. It provides a comprehensive solution for testing and inspecting user interfaces across multiple platforms, enabling developers and testers to easily analyze, debug, and validate UI components.

## Key Features

- **Cross-Platform Support**: Works with Android, Apple, and HarmonyOS devices
- **Real-time UI Inspection**: View and analyze UI components in real-time
- **Component Tree Visualization**: Explore the hierarchical structure of UI components
- **Image Calculation Tools**: Measure distances, compare screenshots, and analyze UI elements
- **OCR Capabilities**: Extract text from UI elements for validation
- **Interactive Control**: Control devices directly from the interface
- **Source Code Parsing**: Analyze and understand UI component structure
- **Responsive Web Interface**: Accessible from any modern browser

## Technology Stack

### Backend
- Python 3.12+
- FastAPI
- OpenCV
- psutil
- loguru
- httpx

### Frontend
- React 19+
- TypeScript
- Material UI (MUI)
- Redux Toolkit
- Konva (for canvas operations)
- React Konva

## Quick Start

### Prerequisites
- Python 3.12 or higher
- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

#### Using pip (Recommended)

```bash
pip install test-automation-inspector

# Start the server
ta-inspector -h 127.0.0.1 -p 8080
```

#### From Source

1. Clone the repository

```bash
git clone https://github.com/test-automation-inspector/test-automation-inspector.git
cd test-automation-inspector
```

2. Install backend dependencies

```bash
cd backend
pip install -e .
```

3. Install frontend dependencies

```bash
cd ../frontend
pnpm install  # or npm install, yarn install
```

4. Start the development servers

```bash
# In backend directory
pdm run dev

# In frontend directory
pnpm dev
```

## Usage

1. Connect your device (Android, Apple, or HarmonyOS)
2. Start the Test Automation Inspector server
3. Open your browser and navigate to `http://localhost:8080`
4. Select your device from the connection panel
5. Use the various tools to inspect and analyze your UI

### Main Features

- **Screen Area**: View the device screen in real-time
- **Component Tree Panel**: Explore the hierarchical structure of UI components
- **Component Parser Panel**: Analyze component properties and attributes
- **Image Calculate Panel**: Measure distances and compare UI elements
- **OCR Panel**: Extract and validate text from UI elements
- **Drawing Board**: Annotate and mark areas on the screen

## Project Structure

```
test-automation-inspector/
├── .github/              # GitHub workflows and configurations
├── backend/              # Python backend
│   ├── src/hermes_inspector/  # Main backend code
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core functionality
│   │   ├── interface/    # Device interfaces
│   │   ├── service/      # Services
│   │   ├── static/       # Static files
│   │   ├── utils/        # Utility functions
│   │   └── main.py       # Application entry point
│   ├── tests/            # Backend tests
│   └── pyproject.toml    # Python project configuration
├── frontend/             # React frontend
│   ├── public/           # Public assets
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── store/        # Redux store
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── package.json      # Frontend project configuration
├── test-automation/      # Test automation scripts
├── .gitignore            # Git ignore file
├── LICENSE               # License file
└── README.md             # This README file
```

## Contributing

We welcome contributions to Test Automation Inspector! Here's how you can help:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Write tests for your changes
5. Submit a pull request

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

## License

Test Automation Inspector is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

- **Author**: tingxiuxiu
- **Email**: 112859811@qq.com
- **GitHub**: [test-automation-inspector](https://github.com/test-automation-inspector/test-automation-inspector)

## Acknowledgements

We'd like to thank all contributors and users of Test Automation Inspector. Your feedback and contributions help make this tool better for everyone.

---

**Happy Testing!** 🎉
