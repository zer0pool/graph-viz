const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/main.tsx",
  mode: "development",

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
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5003",
        changeOrigin: true,
        pathRewrite: { "^/api": "/lineage-manager/api" },
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
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new ModuleFederationPlugin({
      name: "lineage",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App",
        "./index": "./src/index.ts",
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
    clean: true,
  },
  experiments: {
    importMeta: true,
  },
};
