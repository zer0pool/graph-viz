const { ModuleFederationPlugin } = require("webpack").container;
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/main.tsx",
  mode: isProd ? "production" : "development",

  devServer: {
    port: 5100,
    historyApiFallback: {
      index: "/admin-console/index.html",
    },
    hot: false,
    liveReload: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    client: {
      webSocketURL: "auto://0.0.0.0:0/ws",
      overlay: {
        errors: false,
        warnings: false,
        runtimeErrors: false,
      },
    },
    proxy: [
      {
        context: ["/api"],
        target: "http://localhost:5003/lineage-manager",
        changeOrigin: true,
        secure: false,
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
      "import.meta.env.LINEAGE_MFE_URL": JSON.stringify(
        process.env.LINEAGE_MFE_URL ||
          "http://localhost:5101/mfe-lineage/remoteEntry.js",
      ),
      "import.meta.env.CATALOG_MFE_URL": JSON.stringify(
        process.env.CATALOG_MFE_URL ||
          "http://localhost:5102/mfe-catalog/remoteEntry.js",
      ),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public/images", to: "images", noErrorOnMissing: true },
        {
          from: "public/favicon.png",
          to: "favicon.png",
          noErrorOnMissing: true,
        },
        { from: "public/config.template.js", to: "config.template.js" },
      ],
    }),
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        lineage: `lineage@${
          process.env.LINEAGE_MFE_URL ||
          "http://localhost:5101/mfe-lineage/remoteEntry.js"
        }`,
        tableDetailViewer: `tableDetailViewer@${
          process.env.CATALOG_MFE_URL ||
          "http://localhost:5102/mfe-catalog/remoteEntry.js"
        }`,
      },
      shared: {
        react: { singleton: true, eager: true, requiredVersion: "^18.2.0" },
        "react-dom": {
          singleton: true,
          eager: true,
          requiredVersion: "^18.2.0",
        },
        "react-router-dom": {
          singleton: true,
          eager: true,
          requiredVersion: "^6.22.3",
        },
        "lucide-react": {
          singleton: true,
          eager: true,
          requiredVersion: "^0.562.0",
        },
        clsx: { singleton: true, eager: true, requiredVersion: "^2.1.1" },
        "tailwind-merge": {
          singleton: true,
          eager: true,
          requiredVersion: "^3.4.0",
        },
      },
    }),
  ],

  output: {
    publicPath: "auto",
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
