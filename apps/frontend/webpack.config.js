const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const path = require("path");

module.exports = {
  entry: "./src/main.tsx",
  mode: "development",

  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true
        },
        exclude: /node_modules/
      }
    ]
  },

  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {},

      shared: {
        react: {
          singleton: true,
          eager: false,
          requiredVersion: false
        },
        "react-dom": {
          singleton: true,
          eager: false,
          requiredVersion: false
        }
      }
    })
  ],

  output: {
    publicPath: "auto",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true
  }
};
