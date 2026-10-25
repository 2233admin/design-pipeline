(((root,factory)=> {
  if(typeof module==='object'&&module.exports){
    module.exports=factory([
      require('./text-glyph.js'),require('./text-media.js'),require('./text-semantic.js'),require('./text-interactive.js')
    ]);
  }else{
    const parts=root.MotionTextParts;
    if(!parts||!parts.glyph||!parts.media||!parts.semantic||!parts.interactive)throw new Error('Load text-core.js and text-glyph/media/semantic/interactive.js before text.js');
    root.MotionRecipeModules=root.MotionRecipeModules||{};
    root.MotionRecipeModules.text=factory([parts.glyph,parts.media,parts.semantic,parts.interactive]);
  }
})(typeof globalThis==='undefined'?this:globalThis,(parts)=> {
  const recipes={};
  for(const part of parts){
    if(!part||!part.recipes)throw new TypeError('Missing original text recipe part');
    for(const [id,descriptor] of Object.entries(part.recipes)){
      if(!id.startsWith('text.'))throw new TypeError('Wrong text recipe namespace: '+id);
      if(Object.hasOwn(recipes,id))throw new TypeError('Duplicate text recipe mechanism: '+id);
      recipes[id]=descriptor;
    }
  }
  return {group:'text',recipes};
}));
