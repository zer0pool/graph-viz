const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const webpack = require("webpack");
const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  mode: "development",

  devServer: {
    port: 3002,
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
      __API_BASE_URL__: JSON.stringify(process.env.API_BASE_URL || ""),
      __NODE_ENV__: JSON.stringify(process.env.NODE_ENV || "development"),
    }),
    new ModuleFederationPlugin({
      name: "tableDetailViewer",
      filename: "remoteEntry.js",
      exposes: {
        "./index": "./src/index.ts",
        "./TableDetailViewer": "./src/TableDetailViewer.tsx",
        "./views": "./src/viewMount.tsx",
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
};
