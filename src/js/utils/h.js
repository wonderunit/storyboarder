const React = require('react')
const { sv } = require('seview')

module.exports = sv(node => {
  if (typeof node === "string") {
    return node;
  }
  const attrs = node.attrs || {};
  if (attrs.innerHTML) {
    attrs.dangerouslySetInnerHTML = { __html: attrs.innerHTML };
    delete attrs.innerHTML;
  }
  const args = [node.tag, node.attrs || {}].concat(node.children || []);
  return React.createElement.apply(null, args);
})
