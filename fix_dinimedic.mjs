import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svylytekfqhzuiouzral.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDinimedic() {
  console.log('Fetching all products...');
  
  // We'll fetch all products to find those with 'DINIMEDIC' in offers
  let allProducts = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase.from('productos').select('*').range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    page++;
  }
  
  console.log(`Fetched ${allProducts.length} products. Scanning for DINIMEDIC...`);
  
  let productsToUpdate = [];
  
  for (const product of allProducts) {
    if (!product.offers || !Array.isArray(product.offers)) continue;
    
    let changed = false;
    const newOffers = product.offers.map(offer => {
      if (offer.provider === 'DINIMEDIC') {
        changed = true;
        return { ...offer, provider: 'DISMEDIC' };
      }
      return offer;
    });
    
    if (changed) {
      // Deduplicate in case they already uploaded the new one and now have both
      const uniqueOffers = [];
      const seenProviders = new Set();
      
      // We keep the DISMEDIC ones, if there's multiple we just keep one (the latest)
      for (const o of newOffers) {
        if (!seenProviders.has(o.provider)) {
          seenProviders.add(o.provider);
          uniqueOffers.push(o);
        } else {
          // If we see DISMEDIC again, we might want to update it, but simple dedup is fine
          const idx = uniqueOffers.findIndex(u => u.provider === o.provider);
          if (idx !== -1) uniqueOffers[idx] = o; // overwrite with later
        }
      }
      
      productsToUpdate.push({
        id: product.id,
        name: product.name,
        activeIngredient: product.activeIngredient,
        category: product.category,
        nivel: product.nivel,
        offers: uniqueOffers
      });
    }
  }
  
  console.log(`Found ${productsToUpdate.length} products to fix. Updating...`);
  
  if (productsToUpdate.length === 0) {
    console.log('Nothing to do!');
    return;
  }
  
  // Update in chunks
  const chunkSize = 500;
  for (let i = 0; i < productsToUpdate.length; i += chunkSize) {
    const chunk = productsToUpdate.slice(i, i + chunkSize);
    const { error } = await supabase.from('productos').upsert(chunk);
    if (error) throw error;
    console.log(`Updated chunk ${i / chunkSize + 1}`);
  }
  
  console.log('Fix complete!');
}

fixDinimedic().catch(console.error);
