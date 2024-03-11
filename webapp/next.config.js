const webpack = require("webpack");

module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add the DefinePlugin configuration
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.FLUENTFFMPEG_COV": JSON.stringify(false),
      })
    );

    // Important: return the modified config
    return config;
  },
};
