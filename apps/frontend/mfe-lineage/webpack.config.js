const { ModuleFederationPlugin } = require("webpack").container;
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isProd = process.env.NODE_ENV === "production";
const isDeploy = process.env.DEPLOY === "true";

module.exports = {
  entry: "./src/main.tsx",
  mode: isProd ? "production" : "development",
  devtool: "source-map",

  devServer: {
    port: 5101,
    hot: false,
    liveReload: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    client: {
      overlay: {
        errors: false,
        warnings: false,
        runtimeErrors: false,
      },
    },
    proxy: [
      // Lineage Manager Backend (Port 5003)
      {
        context: ["/lineage-manager"],
        target: "http://127.0.0.1:5003",
        changeOrigin: true,
        secure: false,
        logLevel: "debug",
      },
      // Analytics Manager Backend (Port 5002)
      {
        context: ["/analytics-manager"],
        target: "http://127.0.0.1:5002",
        changeOrigin: true,
        secure: false,
        logLevel: "debug",
      },
      // Legacy API fallback (for backward compatibility)
      {
        context: ["/api"],
        target: "http://127.0.0.1:5003",
        changeOrigin: true,
        pathRewrite: { "^/api": "/lineage-manager/api" },
      },
    ],
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: { transpileOnly: true },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      "import.meta.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "development",
      ),
      "import.meta.env.DEV": JSON.stringify(!isProd),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        process.env.API_BASE_URL || "",
      ),
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public"),
          to: ".",
          globOptions: {
            ignore: ["**/index.html"],
          },
        },
      ],
    }),
    new ModuleFederationPlugin({
      name: "lineage",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App",
        "./index": "./src/index.ts",
      },
      shared: {
        react: { singleton: true, eager: false, requiredVersion: "^18.2.0" },
        "react-dom": {
          singleton: true,
          eager: false,
          requiredVersion: "^18.2.0",
        },
        "react-router-dom": {
          singleton: true,
          eager: false,
          requiredVersion: "^6.22.3",
        },
        "lucide-react": {
          singleton: true,
          eager: false,
          requiredVersion: "^0.562.0",
        },
        clsx: { singleton: true, eager: false, requiredVersion: "^2.1.1" },
        "tailwind-merge": {
          singleton: true,
          eager: false,
          requiredVersion: "^3.4.0",
        },
      },
    }),
  ],

  output: {
    publicPath: (isProd || isDeploy) ? "/admin-console/mfe-lineage/" : "http://localhost:5101/",
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    clean: true,
  },

  experiments: {
    importMeta: true,
  },

  optimization: {
    minimize: isProd,
  },
};
