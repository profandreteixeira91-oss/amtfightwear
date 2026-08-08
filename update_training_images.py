import json
import psycopg2
import os

def update_images():
    # Load the asset URL
    try:
        with open('src/assets/training-composition.png.asset.json', 'r') as f:
            asset_data = json.load(f)
            new_image_url = asset_data['url']
    except Exception as e:
        print(f"Error loading asset: {e}")
        return

    # Database connection parameters from environment
    # In Lovable Cloud, we use the standard postgres env vars if available, 
    # but usually we can just run a psql command.
    
    # SQL to update products in the training line
    sql = """
    UPDATE public.products
    SET images = (
        CASE 
            WHEN images IS NULL OR jsonb_array_length(images) = 0 THEN jsonb_build_array(%s)
            WHEN NOT (images @> jsonb_build_array(%s)) THEN images || jsonb_build_array(%s)
            ELSE images
        END
    )
    WHERE (name ILIKE '%%Faixa%%Training%%')
       OR (name ILIKE '%%Faixa%%Jiu-Jitsu%%Training%%')
       OR (name ILIKE '%%Faixa%%Judo%%Training%%');
    """
    
    print(f"Updating products with image: {new_image_url}")
    # We will use the psql CLI directly for simplicity in the sandbox
    cmd = f"psql -c \"UPDATE public.products SET images = (CASE WHEN images IS NULL OR jsonb_array_length(images) = 0 THEN jsonb_build_array('{new_image_url}') WHEN NOT (images @> jsonb_build_array('{new_image_url}')) THEN images || jsonb_build_array('{new_image_url}') ELSE images END) WHERE (name ILIKE '%Faixa%Training%') OR (name ILIKE '%Faixa%Jiu-Jitsu%Training%') OR (name ILIKE '%Faixa%Judo%Training%');\""
    os.system(cmd)

if __name__ == "__main__":
    update_images()
