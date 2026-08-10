import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShowContext'
import Title from './Title';
import ProductItem from './ProductItem';

const LatestCollection = () => {

    const { products } = useContext(ShopContext);
    const [latestProducts, setLatestProducts] = useState([]);

    useEffect(()=>{
        setLatestProducts(products.slice(0,10));
    },[products])


  return (
    <div className='my-10'>
      <div className='text-center py-8 text-3xl'>
        <Title text1={'LATEST'} text2={'COLLECTIONS'}/>
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Dignissimos reiciendis, dolorem numquam eligendi veniam expedita labore quis incidunt. Impedit quas non ipsum eligendi nesciunt? Quia animi totam commodi deserunt ullam.
        Ex aut corrupti at. Tenetur, eaque voluptatem asperiores ad eveniet libero eius optio rerum ratione necessitatibus! Exercitationem, maxime excepturi. Distinctio quaerat dolorum maiores doloribus delectus inventore asperiores eos officia tempora?
        Quas voluptatem animi ratione placeat optio est quisquam, vel, dolorum adipisci non vitae praesentium eum? Laudantium sit placeat, quaerat qui unde eligendi! Cupiditate ratione vitae voluptatum placeat minima laudantium provident.</p>
      </div>

      {/* Rendering Products */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap4 gap-y-6'>
        {
            latestProducts.map((item,index)=>(
                <ProductItem key={index} id={item._id} image={item.image} name={item.name} price={item.price}/>
            ))
        }
      </div>
    </div>
  )
}

export default LatestCollection
