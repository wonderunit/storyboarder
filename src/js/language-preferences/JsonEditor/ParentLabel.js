const ParentLabel = ({value, marginLeft}) => {

    return (
      <div 
      className="json-label"
      style={{
            marginLeft: marginLeft, 
            display: "flex"
        }}>
        <div>{value + ' {'}</div>
        <div 
          style={{marginLeft: 10}}>
        </div>
      </div>
    );
       
}

export default ParentLabel