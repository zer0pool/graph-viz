const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

console.log("Webpack running for shell...");
console.log("Current directory:", __dirname);
console.log("Mode:", process.env.NODE_ENV);

module.exports = {
  entry: "./src/main.tsx",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",

  devServer: {
    port: 5100,
    historyApiFallback: {
      index: "/admin-console/index.html",
    },
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
      "import.meta.env.LINEAGE_REMOTE_URL": JSON.stringify(
        process.env.LINEAGE_REMOTE_URL || "http://localhost:5101/remoteEntry.js"
      ),
      "import.meta.env.TABLE_DETAIL_REMOTE_URL": JSON.stringify(
        process.env.TABLE_DETAIL_REMOTE_URL ||
          "http://localhost:5102/remoteEntry.js"
      ),
      "import.meta.env.DEV": JSON.stringify(
        process.env.NODE_ENV !== "production"
      ),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public/images"),
          to: "images",
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, "public/favicon.png"),
          to: "favicon.png",
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, "public/config.template.js"),
          to: "config.template.js",
        },
      ],
    }),
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        lineage: `lineage@${
          process.env.LINEAGE_REMOTE_URL ||
          "http://localhost:5101/remoteEntry.js"
        }`,
        tableDetailViewer: `tableDetailViewer@${
          process.env.TABLE_DETAIL_REMOTE_URL ||
          "http://localhost:5102/remoteEntry.js"
        }`,
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
  optimization: {
    minimize: process.env.NODE_ENV === "production",
  },
};
