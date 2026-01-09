const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const webpack = require("webpack");
const path = require("path");

module.exports = {
  entry: "./src/main.tsx",
  mode: "development",

  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: false, // Disable HMR to avoid WebSocket errors
    liveReload: false, // Also disable live reload
    client: {
      webSocketURL: "auto://0.0.0.0:0/ws", // Suppress WebSocket connection attempts
      overlay: {
        errors: false, // Disable error overlay
        warnings: false,
        runtimeErrors: false,
      },
    },
    proxy: {
      "/api": {
        target: "http://localhost:5003/lineage-manager",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        process.env.API_BASE_URL || ""
      ),
      "import.meta.env.DEV": JSON.stringify(
        process.env.NODE_ENV !== "production"
      ),
    }),
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        lineage: "lineage@http://localhost:3001/remoteEntry.js",
        tableDetailViewer:
          "tableDetailViewer@http://localhost:3002/remoteEntry.js",
      },

      shared: {
        react: {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
        "react-dom": {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
      },
    }),
  ],

  output: {
    publicPath: "auto",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },
  experiments: {
    importMeta: true,
  },
};
